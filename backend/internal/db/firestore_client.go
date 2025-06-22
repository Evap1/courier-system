package db

import (
	"context"
	"os"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

// firestoreClient wraps the Google client so other layers don't import
type FirestoreClient struct {
	*firestore.Client
}

// NewFirestoreClient builds a Firestore connection using the service-account
// JSON whose path is in env var FIREBASE_SA.
func NewFirestoreClient(ctx context.Context, gcpProjectID string) (*FirestoreClient, error) {
	credentialsPath := os.Getenv("FIREBASE_SA")
	opt := option.WithCredentialsFile(credentialsPath)

	client, err := firestore.NewClient(ctx, gcpProjectID, opt)
	if err != nil {
		return nil, err
	}
	return &FirestoreClient{client}, nil
}
