package service

import "fmt"

// Canonical status strings — single source of truth.
const (
	StatusPosted    = "posted"
	StatusAccepted  = "accepted"
	StatusPickedUp  = "picked_up"
	StatusDelivered = "delivered"
)

// transitionMap encodes the allowed “next” value for each current status.
var transitionMap = map[string]string{
	StatusPosted:    StatusAccepted,
	StatusAccepted:  StatusPickedUp,
	StatusPickedUp:  StatusDelivered,
}

// ErrInvalidTransition is returned when caller skips or repeats a state.
type ErrInvalidTransition struct {
	From, To string
}

func (e ErrInvalidTransition) Error() string {
	return fmt.Sprintf("invalid status change: %s → %s", e.From, e.To)
}

// isValidTransition returns nil if (from->to) is allowed.
func isValidTransition(from, to string) error {
	wantNext, fromOk := transitionMap[from]
	if !fromOk || wantNext != to {
		return ErrInvalidTransition{From: from, To: to}
	}
	return nil
}
