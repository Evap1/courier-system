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
type Handler struct {
	deliverySvc *service.DeliveryService
	userSvc *service.UserService
}

// NewDeliveryHandler injects the service layer.
func NewHandler(d *service.DeliveryService, u *service.UserService) *Handler {
	return &Handler{deliverySvc: d, userSvc: u}
}


// // DeliveryHandler satisfies the generated ServerInterface.
// type DeliveryHandler struct {
// 	svc *service.DeliveryService
// }

// // NewDeliveryHandler injects the service layer.
// func NewDeliveryHandler(s *service.DeliveryService) *DeliveryHandler {
// 	return &DeliveryHandler{svc: s}
// }

// POST /deliveries 
func (h *Handler) CreateDelivery(c *gin.Context) {
	creatorUID := c.GetString("uid") // set by (future) auth middleware
    var req DeliveryCreate                              

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errBody(err))
		return
	}
	ctx := context.Background()

	// allow only the auth business to post a delivery:
	// get it's info, compare to the 
	info, err := h.userSvc.GetBusinessInfo(ctx, creatorUID)
	// if error it's not a business
	if err != nil {
		c.JSON(http.StatusInternalServerError, errBody(err))
		return
	}
	// checking only the correct businees is posting a delivery
	if req.BusinessName != info.BusinessName {
		c.JSON(http.StatusBadRequest, errBody(errors.New("unauthorized: business name does not match authenticated user")))
		return
	}

	apiReq := api.DeliveryCreate{
        BusinessName:        info.BusinessName,
        BusinessAddress:     info.BusinessAddress,
        BusinessLocation:    api.GeoPoint{Lat: info.Location.Lat, Lng: info.Location.Lng},
        DestinationAddress:  req.DestinationAddress,
        DestinationLocation: api.GeoPoint{Lat: req.DestinationLocation.Lat, Lng: req.DestinationLocation.Lng},
        Item:                req.Item,
    }


	response, err := h.deliverySvc.CreateDelivery(ctx, &apiReq, creatorUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errBody(err))
		return
	}
	c.JSON(http.StatusCreated, response)
}

// === GET /deliveries ===
func (h *Handler) ListDeliveries(c *gin.Context, params ListDeliveriesParams) {
	flt := service.ListFilter{
		Role: "",
		BusinessName: "",
		PageToken: "",
		CourierID: "",
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
	// get user's role
	userUID := c.GetString("uid") // set by (future) auth middleware
	ctx := context.Background()
	role, err := h.userSvc.GetUserRole(ctx, userUID)
	if err != nil {
		c.JSON(500, errBody(err))
		return
	}
	// else the role is fine and defined
	flt.Role = role
	if role == "business"{
		info, err := h.userSvc.GetBusinessInfo(ctx, userUID)
		if err != nil {
			c.JSON(500, errBody(err))
			return
		} 
		flt.BusinessName = info.BusinessName
	}
	if role == "courier"{
		flt.CourierID = userUID
	}

	list, nextCursor, err := h.deliverySvc.ListDeliveries(c, flt)
	if err != nil {
		c.JSON(500, errBody(err))
		return
	}
	c.Header("X-Next-Page-Token", nextCursor)
	c.JSON(200, list)
}


// POST / deliveries/id/accept
func (h *Handler) AcceptDelivery(c *gin.Context, deliveryID string) {
	// authenticated courier UID from Gin context
	courierUID, ok := c.Get("uid")             
	if !ok || courierUID == "" {
		c.JSON(http.StatusUnauthorized, errBody(errors.New("missing auth UID")))
		return
	}
	ctx := context.Background()
	role, err := h.userSvc.GetUserRole(ctx, courierUID.(string))
	if err != nil {
		c.JSON(500, errBody(err))
		return
	}

	if role != "courier"{
		c.JSON(http.StatusBadRequest, errBody(errors.New("Only courier can accept a delivery")))
		return
	}
	// here it's only a courier
	updated, err := h.deliverySvc.AcceptDelivery(c, deliveryID, courierUID.(string))

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

// PATCH / deliveries/id/
func (h *Handler) UpdateDelivery(c *gin.Context, deliveryID string) {

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

	ctx := context.Background()
	role, err := h.userSvc.GetUserRole(ctx, courierUID.(string))
	if err != nil {
		c.JSON(500, errBody(err))
		return
	}

	if role != "courier"{
		c.JSON(http.StatusBadRequest, errBody(errors.New("Only courier can update a delivery")))
		return
	}
	// here its only a courier
	updated, err := h.deliverySvc.UpdateDeliveryStatus(c, deliveryID, string(*patch.Status), courierUID.(string))


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

// GET /me
func (h *Handler) GetMe(c *gin.Context) {
	uid, ok := c.Get("uid")
	if !ok || uid == "" {
		c.JSON(http.StatusUnauthorized, errBody(errors.New("missing auth UID")))
		return
	}
	userID := uid.(string)

	ctx := context.Background()

	// Try to get user role first
	role, err := h.userSvc.GetUserRole(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errBody(err))
		return
	}
	if role == "business" {
		info, err := h.userSvc.GetBusinessInfo(ctx, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errBody(err))
			return
		}
		c.JSON(http.StatusOK, OneOfUserFromBusiness(info))	
	} else if role == "courier"{
		info, err := h.userSvc.GetCourierInfo(ctx, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errBody(err))
			return
		}
		c.JSON(http.StatusOK, OneOfUserFromCourier(info))
	} else {
		c.JSON(http.StatusBadRequest, errBody(errors.New("unsupported role")))

	}
}


func OneOfUserFromBusiness(u *api.BusinessUser) api.OneOfUser {
	var wrapper api.OneOfUser
	_ = wrapper.FromBusinessUser(*u)
	return wrapper
}

func OneOfUserFromCourier(u *api.CourierUser) api.OneOfUser {
	var wrapper api.OneOfUser
	_ = wrapper.FromCourierUser(*u)
	return wrapper
}
