# Invan-docs

# Base url

```
https://dev.in1.uz/api/invan-supplier/
```

- Supplier
  - [Auth](#auth)
  - [Login](#login)
  - [Verify](#verify)
  - [Get organizations](#get-organizations)
  - [Dashboard](#dashboard)
  - [Transactions get](#transactions-get)
  - [Get Supplier valuation](#get-supplier-valuation)
  - [Reports](#reports)
  - [Reports sales by item](#reports-sales-by-item)

# Supplier

## Auth

### Login

#### Parameters

| Name         | Required | Example         | Note         |
| ------------ | -------- | --------------- | ------------ |
| phone_number | yes      | "+998954334567" | Valid number |

```
/supplier/login
```

##### Request:

```cURL
curl --location --request POST 'http://0.0.0.0:3003/supplier/login' \
--header 'Content-Type: application/json' \
--data-raw '
{
    "phone_number": "+998954334567"
}'
```

#### Example requests/responses

##### Success response:

```json
{
  "message": "Success",
  "data": {
    "phone_number": "+998954334567"
  }
}
```

##### Response on fail

```json
{
  "message": "not found",
  "data": "+998954334567"
}
```

### Verify

```
/supplier/login
```

#### Request

```cURL
curl --location --request POST 'http://0.0.0.0:3003/supplier/verify' \
--header 'Content-Type: application/json' \
--data-raw '
{
    "phone_number": "+998954334567",
    "otp": 2235
}'
```

#### Parameters

| Name         | Required | Example         | Note         |
| ------------ | -------- | --------------- | ------------ |
| phone_number | yes      | "+998909966551" | Valid number |
| otp          | yes      | "3609"          | length = 4   |

#### Responses

{}

## Get organizations

```
/organizations
```

### Request

```cURL
curl --location --request GET 'http://0.0.0.0:3003/organizations' \
--header 'Accept-version: 1.0.0' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk'
```

## Dashboard

### For diagramm

```
/dashboard/:min/:max
```

### Parameters

<!-- | search   | no       | ""      | length = 4        | -->

| Name       | Required | Example     | Note                                                                        |
| ---------- | -------- | ----------- | --------------------------------------------------------------------------- |
| custom     | yes      | false       | Boolean                                                                     |
| start      | yes      | 10          | min = 0, max = 23                                                           |
| end        | yes      | 12          | min = 0, max = 23                                                           |
| services   | yes      | [""]        | service_ids                                                                 |
| count_type | yes      | 2           | must enum [1, 2, 3, 4, 5, 6]                                                |
| target     | yes      | gross_sales | must enum ['gross_sales', 'refunds','discounts','net_sales','gross_profit'] |

### Request

```
curl --location --request POST 'https://dev.in1.uz/api/invan-supplier/dashboard/1546282800000/1652085011829' \
--header 'Accept-version: 1.0.0' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk' \
--header 'Content-Type: application/json' \
--data-raw '{
    "custom": false,
    "start": 2,
    "end": 10,
    "services": [],
    "search": "search",
    "target": "gross_sales",
    "count_type": 1
}'
```

```
/dashboard/:min/:max/:limit/:page
```

### Parameters

<!-- | search   | no       | ""      | length = 4        | -->

| Name       | Required | Example     | Note                                                                        |
| ---------- | -------- | ----------- | --------------------------------------------------------------------------- |
| custom     | yes      | false       | Boolean                                                                     |
| start      | yes      | 10          | min = 0, max = 23                                                           |
| end        | yes      | 12          | min = 0, max = 23                                                           |
| services   | yes      | [""]        | service_ids                                                                 |
| count_type | yes      | 2           | must enum [1, 2, 3, 4, 5, 6]                                                |
| target     | yes      | gross_sales | must enum ['gross_sales', 'refunds','discounts','net_sales','gross_profit'] |

### Request

```cURL
curl --location --request POST 'https://dev.in1.uz/api/invan-supplier/dashboard/1546282800000/1652085011829/10/1' \
--header 'Accept-version: 1.0.0' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk' \
--header 'Content-Type: application/json' \
--data-raw '{
    "custom": false,
    "start": 2,
    "end": 10,
    "services": [],
    "search": "search",
    "target": "gross_sales",
    "count_type": 1
}'
```

## Transactions get

```
/supplier/transactions
```

### Request

```cURL
curl --location --request GET 'http://0.0.0.0:3003/supplier/transactions' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk'
```

## Get Supplier valuation

```
/supplier/valuation
```

### Request

```cURL
curl --location --request GET 'http://0.0.0.0:3003/supplier/valuation' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk'
```

### Responses

{}

## Reports

### Reports sales by item

```
/report/sales/by_item/below/:min/:max
```

### Query Parameters

<!-- | search   | no       | ""      | length = 4        | -->

| Name     | Required | Example                  | Note              |
| -------- | -------- | ------------------------ | ----------------- |
| custom   | no       | false                    | Boolean           |
| start    | no       | 10                       | min = 0, max = 23 |
| end      | no       | 12                       | min = 0, max = 23 |
| services | no       | [""]                     | service_ids       |
| search   | no       | ""                       |                   |
| limit    | no       | 10                       |                   |
| page     | no       | 1                        |                   |
| category | no       | 5fa2777181ca55194b9ae989 | mongodb ObjectID  |

### Request

```cURL
curl --location --request GET 'http://0.0.0.0:3003/report/sales/by_item/below/1546282800000/1652085011829' \
--header 'Accept-user: admin' \
--header 'Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZjU2NDNjMWRjZTRlNzA2YzA2Mjg0YWQiLCJwaG9uZV9udW1iZXIiOiIrOTk4OTU0MzM0NTY3Iiwib3JnYW5pemF0aW9uIjoiNWY1NjQxZThkY2U0ZTcwNmMwNjI4MzdhIiwicm9sZSI6InN1cHBsaWVyIiwiaWF0IjoxNjUyMDgwMzQzfQ.4AKNl4zSHluL9-KQ6WY5XOooHpu7ZTCyyJ1NiblvCqk' \
--header 'Accept-version: 1.0.0'
```
