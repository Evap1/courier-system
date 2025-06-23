package httptransport

import (
	"errors"
	"context"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/Evap1/courier-system/backend/internal/service"
	"github.com/Evap1/courier-system/backend/api"
)

// DeliveryHandler satisfies the generated ServerInterface.
type DeliveryHandler struct {
	svc *service.DeliveryService
}

// NewDeliveryHandler injects the service layer.
func NewDeliveryHandler(s *service.DeliveryService) *DeliveryHandler {
	return &DeliveryHandler{svc: s}
}

// POST /deliveries 
func (h *DeliveryHandler) CreateDelivery(c *gin.Context) {
	creatorUID := c.GetString("uid") // set by (future) auth middleware
    var req DeliveryCreate                              

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errBody(err))
		return
	}

	apiReq := api.DeliveryCreate{
        BusinessName:        req.BusinessName,
        BusinessAddress:     req.BusinessAddress,
        BusinessLocation:    api.GeoPoint{Lat: req.BusinessLocation.Lat, Lng: req.BusinessLocation.Lng},
        DestinationAddress:  req.DestinationAddress,
        DestinationLocation: api.GeoPoint{Lat: req.DestinationLocation.Lat, Lng: req.DestinationLocation.Lng},
        Item:                req.Item,
    }

	ctx := context.Background()

	response, err := h.svc.CreateDelivery(ctx, &apiReq, creatorUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errBody(err))
		return
	}
	c.JSON(http.StatusCreated, response)
}

// === GET /deliveries ===
func (h *DeliveryHandler) ListDeliveries(c *gin.Context, params ListDeliveriesParams) {
	flt := service.ListFilter{
		PageToken: "",
		PageSize:  0,
	}
	if params.PageSize != nil { flt.PageSize = int(*params.PageSize) }
	if params.PageToken != nil { flt.PageToken = *params.PageToken }

	if params.Status != nil {                          // ?status=
		s := string(*params.Status)                
		flt.Status = &s
	}
	if params.Lat != nil && params.Lng != nil && params.R != nil {
		flt.CenterLat = params.Lat
		flt.CenterLng = params.Lng
		flt.RadiusKm  = params.R
	}

	list, nextCursor, err := h.svc.ListDeliveries(c, flt)
	if err != nil {
		c.JSON(500, errBody(err))
		return
	}
	c.Header("X-Next-Page-Token", nextCursor)
	c.JSON(200, list)
}


// POST / deliveries/id/accept
func (h *DeliveryHandler) AcceptDelivery(c *gin.Context, deliveryID string) {
	// authenticated courier UID from Gin context
	courierUID, ok := c.Get("uid")             
	if !ok || courierUID == "" {
		c.JSON(http.StatusUnauthorized, errBody(errors.New("missing auth UID")))
		return
	}

	updated, err := h.svc.AcceptDelivery(c, deliveryID, courierUID.(string))

	switch {
	case err == nil:
		c.JSON(http.StatusOK, updated)
	// case errors.Is(err, service.ErrAlreadyAssigned):
	// 	c.JSON(http.StatusConflict ,errBody(errors.New("delivery already taken")))
	default:
		var bad service.ErrInvalidTransition
		if errors.As(err, &bad) {
			c.JSON(http.StatusBadRequest, errBody(err))
		} else {
			c.JSON(http.StatusInternalServerError, errBody(err))
		}
	}
}

func (h *DeliveryHandler) UpdateDelivery(c *gin.Context, deliveryID string) {

	// parse & validate JSON body
	var patch DeliveryPatch                        // struct from openapi.gen.go
	err := c.ShouldBindJSON(&patch)
	if err != nil {
		c.JSON(http.StatusBadRequest, errBody(err))
		return
	}

	if patch.Status == nil { // the minimal status is accepted != nil
		c.JSON(http.StatusBadRequest, errBody(errors.New("status field is required")))
		return
	}

	// authenticated courier UID from Gin context
	courierUID, ok := c.Get("uid")                // set by auth middleware
	if !ok || courierUID == "" {
		c.JSON(http.StatusUnauthorized, errBody(errors.New("missing auth UID")))
		return
	}

	updated, err := h.svc.UpdateDeliveryStatus(c, deliveryID, string(*patch.Status), courierUID.(string))

	// map service-level errors to HTTP responses
	var InvalidTransition service.ErrInvalidTransition
	//var InvalidUpdate service.ErrInvalidUpdate
	if errors.As(err, &InvalidTransition) || errors.Is(err,service.ErrInvalidUpdate) {
		c.JSON(http.StatusBadRequest, errBody(err))
	} else if err == nil {
		c.JSON(http.StatusOK, updated)
	} else {
		c.JSON(http.StatusInternalServerError, errBody(err))
	}
}

func errBody(e error) Error {
	msg := e.Error()
	return Error{Message: &msg}
}