# Report - Sales totals by Price Types

## Parameters

| Name      | Description                                |
|-----------|--------------------------------------------|
| startDate | Start period as timestamp, inclusive value |
| endDate   | End period as timestamp, exclusive value   |

## Request

```shell script
curl -L -X POST 'http://127.0.0.1:3000/reports/sales/by_price_type' \
-H 'Accept-Version: 1.0.0' \
-H 'accept-user: admin' \
-H 'Authorization: HsrSgitqSqsYdybqTpxj8c' \
-H 'Content-Type: application/json' \
--data-raw '{
    "startDate": 1592202566793,
    "endDate": 1596222000000
}'
```

## Response - on success

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": [
        {
            "_id": "P1",
            "price": 1251000,
            "percent_sale": 85.92,
            "percent_loss": 0.14,
            "total_sale": 1456000,
            "total_profit": 465217.16,
            "total_loss": 2000,
            "total_records": 19,
            "avg_sale": 76631.58
        },
        {
            "_id": "P2",
            "price": 55000,
            "percent_sale": 3.78,
            "percent_loss": 0,
            "total_sale": 1456000,
            "total_profit": 465217.16,
            "total_loss": 2000,
            "total_records": 19,
            "avg_sale": 76631.58
        },
        {
            "_id": "P3",
            "price": 150000,
            "percent_sale": 10.3,
            "percent_loss": 0,
            "total_sale": 1456000,
            "total_profit": 465217.16,
            "total_loss": 2000,
            "total_records": 19,
            "avg_sale": 76631.58
        }
    ]
}
```

## Response - access denied

```
401 - Unauthorized
```

## Response - invalid parameter

```json
{
    "statusCode": 400,
    "error": "Bad Request",
    "message": "body should have required property 'endDate'"
}
```