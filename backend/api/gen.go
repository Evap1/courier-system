//go:build generate
// +build generate

package api
//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest -generate types -package api           -o types.gen.go                                openapi.yaml
//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest -generate gin,types   -package httptransport -o ../internal/transport/http/openapi.gen.go openapi.yaml
