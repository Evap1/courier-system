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
	"fmt"
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
		Payment:			  req.Payment,
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
	Role		 string
	BusinessName string
	CourierID	 string
}

func (s *DeliveryService) ListDeliveries(ctx context.Context, filter ListFilter) ([]*api.Delivery, string, error) {
	
	var result []*api.Delivery

	q := s.firestore.Collection("deliveries").
		OrderBy("createdAt", firestore.Desc)

	// for business, allow only view their deliveries
	if filter.BusinessName != "" {
		q = q.Where("businessName", "==", filter.BusinessName)
	}

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

	for {
		doc, err := iter.Next()
		if err == iterator.Done { break }
		if err != nil { return nil, "", err }

		var d api.Delivery
		// convert firestore fields to type api.Delivery
		if err := doc.DataTo(&d); err != nil { continue }
		//fmt.Println(" checking delivery:", d.Item)
		id := doc.Ref.ID
		d.Id = &id
		fmt.Println("the id is: ", *d.Id)
		// geo-filter on the app server (firestore can’t do distance natively)
		if filter.CenterLat != nil && filter.RadiusKm != nil {
			//fmt.Println("Entered condition for geo-filtering")
			dist := geoDistanceKm(
				*filter.CenterLat, *filter.CenterLng,
				d.BusinessLocation.Lat, d.BusinessLocation.Lng)
			fmt.Println(dist)

			// courier - see posted or its own active/picked_up/delivered deliveries
			// by T/F table, choosing the rows with false assigment
			if dist > *filter.RadiusKm{
				//fmt.Println("Entered condition for dist")
				if filter.Role == "courier"{
					if ((d.AssignedTo != nil && *d.AssignedTo != filter.CourierID) || d.AssignedTo == nil){
						//fmt.Println("emtered if condition in courier role");
						continue
					}
				} else { continue }
			}
		}
		// if courier but dont apply filtering, make sure only assigned to
		if filter.Role == "courier"{
			// courier without status - show only posted and assigned to. if i'm here dist is ok or not filtered.
			if filter.Status == nil{
				if d.Status == "posted" && d.AssignedTo == nil {
					// ok
				} else if d.Status != "posted" && d.AssignedTo != nil && *d.AssignedTo == filter.CourierID{
					// ok
				} else{
					continue
				}
			// filter status != nil -> its posted or not posted.
			// posted? show only in the limits. by here the limits are correct or unfiltered.
			} else if *filter.Status == "posted"{
				// ok
			// not posted? show only deliveries assigned to me.
			} else if d.AssignedTo != nil && *d.AssignedTo == filter.CourierID{
				// ok
			} else {continue}
		}

		result = append(result, &d)
	}

	// compute the next-page cursor
	nextPageToken := ""
	if len(result) > 0  {
		last := result[len(result)-1]
		if last.Id != nil {
			nextPageToken = *last.Id
		}
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
		if newStatus == StatusDelivered { 
			d.AssignedTo = nil;
			d.DeliveredBy = &courierUID;
		}
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

