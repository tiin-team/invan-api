# Invan-docs

# Base url

```
(pos.in1.uz/api/invan-supplier)
```

- Supplier
  - [Login](#login)
  - [Verify](#verify)
  - [Transactiosn get](#transactions-get)

# Supplier

## Login

### Parameters

| Name         | Mandatory | Example         | Note         |
| ------------ | --------- | --------------- | ------------ |
| phone_number | yes       | "+998909966561" | Valid number |

### Responses

| HTTP Code | Code  | Message          | Data               |
| --------- | ----- | ---------------- | ------------------ | ---------------------------------- |
| 200       | 0     | Success          | Ok                 |
| <!--      | 400   | 56000            | Supplier not found | Driver with phone number not found |
| 400       | 55001 | Validation error | Data related error | -->                                |

### Example requests/responses

#### Request:

```shell script
curl --location --request POST 'supplier/login' \
--header 'Content-Type: application/json' \
--data-raw '{
    "phone_number":"+998909966561"
}'
```

#### Success response:

```json
{
  "message": "Success",
  "data": {
    "phone_number": "+998909966561"
  }
}
```

#### Response on fail

```json
{
  "message": "not found",
  "data": "+998909966965"
}
```

## Verify

### Parameters

| Name         | Mandatory | Example         | Note         |
| ------------ | --------- | --------------- | ------------ |
| phone_number | yes       | "+998909966551" | Valid number |
| otp          | yes       | "3609"          | length = 4   |

### Responses

| HTTP Code | Code  | Message               | Data                               |
| --------- | ----- | --------------------- | ---------------------------------- |
| 200       | 0     | Success               | Newly created user ID              |
| 400       | 55001 | Validation error      | Data related error                 |
| 400       | 56000 | Driver not found      | Driver with phone number not found |
| 400       | 56003 | Too frequent attempts | Too frequent attempts              |
| 400       | 56002 | Code does not match   | Code does not match                |

## Get transactions

### Parameters

| Name         | Mandatory | Example         | Note         |
| ------------ | --------- | --------------- | ------------ |
| phone_number | yes       | "+998909966551" | Valid number |
| otp          | yes       | "3609"          | length = 4   |

### Responses

| HTTP Code | Code  | Message               | Data                               |
| --------- | ----- | --------------------- | ---------------------------------- |
| 200       | 0     | Success               | Newly created user ID              |
| 400       | 55001 | Validation error      | Data related error                 |
| 400       | 56000 | Driver not found      | Driver with phone number not found |
| 400       | 56003 | Too frequent attempts | Too frequent attempts              |
| 400       | 56002 | Code does not match   | Code does not match                |
