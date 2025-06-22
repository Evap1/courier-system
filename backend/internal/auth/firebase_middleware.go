// Package auth – all request-authentication helpers live here.
//
// Requires two env vars at runtime:
//   FIREBASE_SA     – absolute path to the Google service-account JSON
//   GCP_PROJECT_ID  – the Firestore project ID
package auth

import (
	"context"
	"net/http"
	"strings"
	fbauth "firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

// Middleware verifies the Bearer JWT coming from the frontend,
// aborts with 401 on failure, and puts the Firebase UID in Gin context.
func Middleware(ac *fbauth.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		const prefix = "Bearer "

		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, prefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized,
				gin.H{"msg": "missing bearer token"})
			return
		}

		idToken := strings.TrimPrefix(h, prefix)
		tok, err := ac.VerifyIDToken(context.Background(), idToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized,
				gin.H{"msg": "invalid or expired token"})
			return
		}

		// on success hand over to the downstream handler
		c.Set("uid", tok.UID)
		c.Next()
	}
}
