package main

import (
	"context"
	"log"
	"os"
    "github.com/gin-contrib/cors"

	firebase "firebase.google.com/go/v4"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/option"
    "github.com/joho/godotenv"
	"github.com/Evap1/courier-system/backend/internal/auth"          // the new package
	"github.com/Evap1/courier-system/backend/internal/db"
	"github.com/Evap1/courier-system/backend/internal/service"
	httptransport "github.com/Evap1/courier-system/backend/internal/transport/http"
)

func main() {
	// auto-load .env
	godotenv.Load()

	// env sanity
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		log.Fatal("GCP_PROJECT_ID not set")
	}
	saPath := os.Getenv("FIREBASE_SA")
	if saPath == "" {
		log.Fatal("FIREBASE_SA (service-account JSON path) not set")
	}

	//  firebase initialisation 
	ctx := context.Background()
	fbApp, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(saPath))
	if err != nil {
		log.Fatalf("firebase init: %v", err)
	}
	authClient, err := fbApp.Auth(ctx)
	if err != nil {
		log.Fatalf("firebase auth client: %v", err)
	}

	// firestore initialisation 
	fs, err := db.NewFirestoreClient(ctx, projectID)
	if err != nil {
		log.Fatalf("firestore: %v", err)
	}
	defer fs.Close()

	//  domain + handler 
	userSvc := service.NewUserService(fs)
	deliverySvc := service.NewDeliveryService(fs)
	handler := httptransport.NewHandler(deliverySvc, userSvc) // implements ServerInterface

	//  HTTP router using gin
	router := gin.Default()

    // allow frontend requests (CORS)
    router.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
        AllowMethods:     []string{"GET", "POST", "PATCH", "OPTIONS"},
        AllowHeaders:     []string{"Authorization", "Content-Type"},
        ExposeHeaders:    []string{"X-Next-Page-Token"},
        AllowCredentials: true,
    }))

	router.Use(auth.Middleware(authClient))          // protect everything
	httptransport.RegisterHandlers(router, handler)  // all routes from openapi.gen.go 

	// startup the server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("server listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
