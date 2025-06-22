package service

import (
	"context"
	"time"
	"errors"
    "cloud.google.com/go/firestore"	 
	"github.com/google/uuid"
	"github.com/Evap1/courier-system/backend/internal/db"
	"github.com/Evap1/courier-system/backend/api"
	"google.golang.org/api/iterator"
)

// api.Delivery defined by the yaml in 	backend/internal/transport/http/openapi.gen.go

// DeliveryService groups methods that operate on one delivery aggregate.
// a pointer holding one Firestore client. The pointer itself never changes; the client is thread-safe and reused for every request.
type DeliveryService struct {
	firestore *db.FirestoreClient
}

// NewDeliveryService wires Firestore into the domain layer.
// called once from main.go at statup
func NewDeliveryService(fs *db.FirestoreClient) *DeliveryService {
	return &DeliveryService{firestore: fs}
}

// POST /DELIVERIES
// CreateDelivery validates input, fills server-side fields, and persists it.
func (s *DeliveryService) CreateDelivery(ctx context.Context, req *api.DeliveryCreate, creatorUID string) (*api.Delivery, error) {

	now := time.Now().UTC()
    id  := uuid.NewString()

	// due to import cycles, for us it's the same object although it's of a different type
	delivery := &api.Delivery{
		Id:                   &id,
		CreatedBy:            &creatorUID,
		BusinessId:           &creatorUID, 
		BusinessName:         req.BusinessName,
		BusinessAddress:      req.BusinessAddress,
		BusinessLocation:     req.BusinessLocation,
		DestinationAddress:   req.DestinationAddress,
		DestinationLocation:  req.DestinationLocation,
		Item:                 req.Item,
		Status:               api.DeliveryStatusPosted,
		CreatedAt:            &now,
	}

	_, err := s.firestore.Collection("deliveries").Doc(id).Set(ctx, delivery)
	if err != nil {
		return nil, err
	}
	return delivery, nil
}


// LISTDELIVERIES
type ListFilter struct {
	Status       *string
	CenterLat    *float64
	CenterLng    *float64
	RadiusKm     *float64
	PageSize     int
	PageToken    string // firestore cursor; empty for first page
}

func (s *DeliveryService) ListDeliveries(ctx context.Context, filter ListFilter) ([]*api.Delivery, string, error) {

	q := s.firestore.Collection("deliveries").
		OrderBy("createdAt", firestore.Desc)

	if filter.Status != nil {
		q = q.Where("status", "==", *filter.Status)
	}
	if filter.PageSize > 0 {
		q = q.Limit(filter.PageSize)
	}
	if filter.PageToken != "" {
		doc, _ := s.firestore.Doc(filter.PageToken).Get(ctx)
		q = q.StartAfter(doc)
	}

	// run the query & stream results
	iter := q.Documents(ctx)
	defer iter.Stop()

	var result []*api.Delivery
	for {
		doc, err := iter.Next()
		if err == iterator.Done { break }
		if err != nil { return nil, "", err }

		var d api.Delivery
		// convert firestore fields to type api.Delivery
		if err := doc.DataTo(&d); err != nil { continue }

		// geo-filter on the app server (firestore can’t do distance natively)
		if filter.CenterLat != nil && filter.RadiusKm != nil {
			dist := geoDistanceKm(
				*filter.CenterLat, *filter.CenterLng,
				d.BusinessLocation.Lat, d.BusinessLocation.Lng)
			if dist > *filter.RadiusKm { continue }
		}
		// append the correct delivery by the values
		result = append(result, &d)
	}

	// compute the next-page cursor
	var nextPageToken string
	if len(result) == filter.PageSize {
		nextPageToken = *result[len(result)-1].Id // simplest cursor
	}
	return result, nextPageToken, nil
}

// POST / deliveries/id/accept
// Transaction reads the doc, checks AssignedTo, writes new doc.
// If two couriers race, the second txn fails with ErrAlreadyAssigned.
var ErrAlreadyAssigned = errors.New("delivery already assigned")

var ErrInvalidUpdate = errors.New("this delivery assigned to different courier")

func (s *DeliveryService) AcceptDelivery(ctx context.Context, deliveryID, courierUID string,) (*api.Delivery, error) {

    docRef := s.firestore.Collection("deliveries").Doc(deliveryID) //creates a reference to /deliveries/{id} once
    //var accepted *api.Delivery // 	will hold updated doc after commit.
	var snap *firestore.DocumentSnapshot

	// atomic read-modify-write; protects from race conditions
	// func is a callback function
    err := s.firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
        innerSnap, err := tx.Get(docRef)
        if err != nil { return err }

        var d api.Delivery

		err = innerSnap.DataTo(&d) // fill delivery srtuct fields
		if err != nil { return err }

		// state machine status 
		err = isValidTransition(string(d.Status), StatusAccepted)
		if err != nil { return err }

		// helper to avoid race condition, should be ok without it thanks to firebase transaction parallellism
		// if d.AssignedTo != "" {
		// 	return ErrAlreadyAssigned
		// }

        d.AssignedTo = &courierUID
        d.Status     = api.DeliveryStatusAccepted
		snap = innerSnap
		// commit changes to DB
		return tx.Set(docRef, d)
		// if err != nil { return err }

		// // if reached here, the commit is successfull, the delivery is accepted
        // accepted = &d
        // return nil
    })
    // if err != nil { return nil, err }
    // return accepted, nil
	if err != nil { return nil, err }
	// if reached here, the commit is successfull, the delivery is updated
	// re-read to return fresh doc
	snap, err = docRef.Get(ctx)
	if err != nil { return nil , err }

	var d api.Delivery
	err = snap.DataTo(&d)
	if err != nil { return nil , err }

	return &d, nil
}


// PATCH /deliveries/{id}
// TODO:
// 1. make sure only the assigned courier can modify
// 2. if delivered set the courier to null
// 3 . more problems
func (s *DeliveryService) UpdateDeliveryStatus(ctx context.Context, deliveryID string, newStatus string, courierUID string) (*api.Delivery, error) {

	docRef := s.firestore.Collection("deliveries").Doc(deliveryID)
	var snap *firestore.DocumentSnapshot

	err := s.firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		innerSnap, err := tx.Get(docRef)
		if err != nil { return err }

		var d api.Delivery
		err = innerSnap.DataTo(&d)
		if err != nil { return err }

		// state machine status
		err = isValidTransition(string(d.Status), newStatus)
		if err != nil { return err }

		// allow only the assigen courier to update
		if d.AssignedTo == nil ||  *d.AssignedTo != courierUID { return ErrInvalidUpdate }

		d.Status = api.DeliveryStatus(newStatus)
		
		// dispatch the courier from the delivery
		// see if nil is ok or emprty string is better
		if newStatus == StatusDelivered { d.AssignedTo = nil}
		snap = innerSnap
		// commit changes to DB
		return tx.Set(docRef, d)
	})
	if err != nil { return nil, err }
	// if reached here, the commit is successfull, the delivery is updated
	// re-read to return fresh doc
	snap, err = docRef.Get(ctx)
	if err != nil { return nil , err }

	var d api.Delivery
	err = snap.DataTo(&d)
	if err != nil { return nil , err }

	return &d, nil
}
