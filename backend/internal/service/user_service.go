package service

import (
	"context"
	"github.com/Evap1/courier-system/backend/internal/db"
	"github.com/Evap1/courier-system/backend/api"
	"fmt"
	"google.golang.org/api/iterator"

)

type UserService struct {
	firestore *db.FirestoreClient
}

func NewUserService(fs *db.FirestoreClient) *UserService {
	return &UserService{firestore: fs}
}


func (u *UserService) GetUserRole(ctx context.Context, uid string) (string, error) {
	doc, err := u.firestore.Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		return "", err
	}
	role, ok := doc.Data()["role"].(string)
	if !ok {
		return "", fmt.Errorf("role missing or invalid")
	}
	return role, nil
}

func (u *UserService) GetBusinessInfo(ctx context.Context, uid string) (*api.BusinessUser, error){
	doc, err := u.firestore.Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		return nil, err
	}

	var business api.BusinessUser
	// convert firestore fields to type api.BusinessUserRole
	err = doc.DataTo(&business)
	if err != nil { return nil , err }

	if business.Role != api.Business {
		return nil, fmt.Errorf("not a business user")
	}

	// if reached here, its a buisness user and we can extarc it's fields
	// return object with the fields of the business
	business.Id = doc.Ref.ID
	return &business, nil
}

func (u *UserService) GetCourierInfo(ctx context.Context, uid string) (*api.CourierUser, error){
	doc, err := u.firestore.Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		return nil, err
	}
	var courier api.CourierUser

	// convert firestore fields to type api.CusinessUserRole
	err = doc.DataTo(&courier)
	if err != nil { return nil, err }

	if courier.Role != api.Courier {
		return nil, fmt.Errorf("not a courier user")
	}
	// if reached here, its a courier user and we can extarc it's fields
	// return object with the fields of the business
	courier.Id = doc.Ref.ID
	return &courier, nil
}

func (u *UserService) GetAllCouriers(ctx context.Context) ( []*api.CourierUser , error){
	iter := u.firestore.Collection("users").Where("role", "==", "courier").Documents(ctx)
	defer iter.Stop()

	var couriers []*api.CourierUser
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var courier api.CourierUser
		err = doc.DataTo(&courier)
		if err != nil {
			continue // skip malformed document
		}
		courier.Id = doc.Ref.ID
		couriers = append(couriers, &courier)
	}
	return couriers, nil
}

func (u *UserService) GetAllBusinesses(ctx context.Context) ([]*api.BusinessUser, error){
	iter := u.firestore.Collection("users").Where("role", "==", "business").Documents(ctx)
	defer iter.Stop()

	var businesses []*api.BusinessUser
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var business api.BusinessUser
		err = doc.DataTo(&business)
		if err != nil {
			continue
		}
		business.Id = doc.Ref.ID
		businesses = append(businesses, &business)
	}
	return businesses, nil
}
