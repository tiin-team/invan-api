# Invan-docs

# Base url

```
https://dev.in1.uz/api/invan-supplier/
```

- Supplier
  - [Login](#login)
  - [Verify](#verify)
  - [Dashboard](#dashboard)
  - [Transactions get](#transactions-get)
  - [Get Supplier valuation](#get-supplier-valuation)

# Supplier

## Login

### Parameters

| Name         | Required | Example         | Note         |
| ------------ | -------- | --------------- | ------------ |
| phone_number | yes      | "+998954334567" | Valid number |

#### Request:

```cURL
curl --location --request POST 'http://0.0.0.0:3003/supplier/login' \
--header 'Content-Type: application/json' \
--data-raw '
{
    "phone_number": "+998954334567"
}'
```

### Example requests/responses

#### Success response:

```json
{
  "message": "Success",
  "data": {
    "phone_number": "+998954334567"
  }
}
```

#### Response on fail

```json
{
  "message": "not found",
  "data": "+998954334567"
}
```

## Verify

### Request

```cURL
curl --location --request POST 'http://0.0.0.0:3003/supplier/verify' \
--header 'Content-Type: application/json' \
--data-raw '
{
    "phone_number": "+998954334567",
    "otp": 2235
}'
```

### Parameters

| Name         | Required | Example         | Note         |
| ------------ | -------- | --------------- | ------------ |
| phone_number | yes      | "+998909966551" | Valid number |
| otp          | yes      | "3609"          | length = 4   |

### Responses

{}

## Dashboard

### Parameters

<!-- | search   | no       | ""      | length = 4        | -->

| Name     | Required | Example | Note              |
| -------- | -------- | ------- | ----------------- |
| custom   | yes      | false   | Boolean           |
| start    | yes      | 10      | min = 0, max = 23 |
| end      | yes      | 12      | min = 0, max = 23 |
| services | yes      | [""]    | service_ids       |

curl --location --request POST 'http://0.0.0.0:3003/dashboard/1546282800000/1652085011829/10/1' \
--header 'Accept-version: 1.0.0' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk' \
--header 'Content-Type: application/json' \
--data-raw '{
"custom": false,
"start": 2,
"end": 10,
"services": [],
"employees": [],
"search": "search"
}'

## Transactions get

### Request

```cURL
curl --location --request GET 'http://0.0.0.0:3003/supplier/transactions' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk'
```

## Get Supplier valuation

### Request

```cURL
curl --location --request GET 'http://0.0.0.0:3003/supplier/valuation' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk'
```

### Responses

{}
