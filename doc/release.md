# Release Management

- [Upload a new release](#upload-a-new-release)
- [Update an existing release](#update-an-existing-release)
- [Delete an existing release](#remove-an-existing-release)
- [Get a release](#get-a-release)
- [Get releases list](#get-release-list)
- [Get the newest release](#get-the-newest-release)

## Upload a new release

### Parameters

| Name         | Description    | Sample value  |
|--------------|----------------|---------------|
| file         | File object    |               |
| version      | Version number | 0.1.3.14      |
| build_number | Build number   | 14            |
| change_log   | Change history | Bug 123 fixed |

On success, response `data.release` contains a newly added release info.

### Request

```shell script
curl -L -X POST 'http://127.0.0.1:3000/release/add' \
-H 'Accept-Version: 1.0.0' \
-H 'accept-user: admin' \
-H 'Authorization: HsrSgitqSqsYdybqTpxj8c' \
-F 'file=@/home/neo/Downloads/InvanPosInstaller.exe' \
-F 'version=0.1.3.14' \
-F 'build_number=14' \
-F 'change_log=Changes:
- change #1
- change #2
- change #3'
```

### Response on success

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": {
        "release": {
            "_id": "5f32e839b1250c6c98dc66a2",
            "version": "0.1.3.14",
            "build_number": 14,
            "change_log": "Changes:\n- change #1\n- change #2\n- change #3",
            "file_name": "1597171769771db7709d5c0c956eb664906e8ee97ee54InvanPosInstaller.exe",
            "file_size": 22719,
            "md5_hash": "db7709d5c0c956eb664906e8ee97ee54",
            "__v": 0
        }
    }
}
```

### Response on fail

```json
{
    "statusCode": 400,
    "error": "Bad Request",
    "message": "body should have required property 'change_log'"
}
```

```json
{
    "message": "Release already exists",
    "statusCode": 400,
    "error": "Bad Request"
}
```

## Update an existing release

URL format:

```
http://host:port/release/:id/update
```

where `:id` is the existing release ID.

### Parameters

| Name         | Description    | Sample value  |
|--------------|----------------|---------------|
| file         | File object    |               |
| version      | Version number | 0.1.3.14      |
| build_number | Build number   | 14            |
| change_log   | Change history | Bug 123 fixed |

On success, response `data.release` contains the updated release info.

### Request

```shell script
curl -L -X POST 'http://127.0.0.1:3000/release/5f3383448cf4bf0ea4f3bff2/update' \
-H 'Accept-Version: 1.0.0' \
-H 'accept-user: admin' \
-H 'Authorization: HsrSgitqSqsYdybqTpxj8c' \
-F 'file=@/home/neo/Downloads/InvanPosInstaller.exe' \
-F 'version=0.1.3.15' \
-F 'build_number=15' \
-F 'change_log=Changes:
- change #1
- change #2
- change #3.1'
```

### Response on success

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": {
        "release": {
            "_id": "5f3383448cf4bf0ea4f3bff2",
            "version": "0.1.3.15",
            "build_number": 15,
            "change_log": "Changes:\n- change #1\n- change #2\n- change #3.1",
            "file_name": "InvanPosInstaller.exe",
            "file_size": 2039494,
            "md5_hash": "d30b459f237025a61f6fd3d2c5390b6b",
            "createdAt": "2020-08-12T05:51:00.059Z",
            "updatedAt": "2020-08-12T13:48:59.301Z",
            "__v": 0
        }
    }
}
```

### Response on fail

```json
{
    "statusCode": 400,
    "error": "Bad Request",
    "message": "body should have required property 'change_log'"
}
```

```json
{
    "message": "Release not found",
    "statusCode": 400,
    "error": "Bad Request"
}
```

## Remove an existing release

URL format:

```
http://host:port/release/:id/delete
```

where `:id` is the existing release ID.

### Request

```shell script
curl -L -X POST 'http://127.0.0.1:3000/release/5f3383448cf4bf0ea4f3bff2/delete' \
-H 'Accept-Version: 1.0.0' \
-H 'accept-user: admin' \
-H 'Authorization: HsrSgitqSqsYdybqTpxj8c'
```

### Response on success

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": {
        "success": true
    }
}
```

### Response on fail

```json
{
    "message": "Release not found",
    "statusCode": 400,
    "error": "Bad Request"
}
```

## Get a release

URL format:

```
http://host:port/release/:id
```

where `:id` is the existing release ID.

### Request

```shell script
curl -L -X GET 'http://127.0.0.1:3000/release/5f34227972e9970d7e4d9d4c' \
-H 'Accept-Version: 1.0.0' \
-H 'accept-user: admin' \
-H 'Authorization: HsrSgitqSqsYdybqTpxj8c'
```

### Response on success

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": {
        "release": {
            "_id": "5f34227972e9970d7e4d9d4c",
            "version": "0.1.3.14",
            "build_number": 14,
            "change_log": "Changes:\n- change #1\n- change #2\n- change #3",
            "file_name": "backupsettings.conf",
            "file_size": 22719,
            "md5_hash": "db7709d5c0c956eb664906e8ee97ee54",
            "createdAt": "2020-08-12T17:10:17.173Z",
            "updatedAt": "2020-08-12T17:10:17.173Z",
            "__v": 0
        }
    }
}
```

### Response on fail

```json
{
    "message": "Release not found",
    "statusCode": 400,
    "error": "Bad Request"
}
```

## Get release list

URL format:

```
http://host:port/release
```

### Request

```shell script
curl -L -X GET 'http://127.0.0.1:3000/release' \
-H 'Accept-Version: 1.0.0' \
-H 'accept-user: admin' \
-H 'Authorization: HsrSgitqSqsYdybqTpxj8c'
```

### Response on success

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": {
        "releases": [
            {
                "_id": "5f342315b031ed0f16e70862",
                "version": "0.1.3.15",
                "build_number": 15,
                "change_log": "Changes:\n- change #1\n- change #2\n- change #3",
                "file_name": "Domain-Driven_Design_Distilled_(2016).pdf",
                "file_size": 8994089,
                "md5_hash": "5cb8909c63b875649ebe642549ccec44",
                "createdAt": "2020-08-12T17:12:53.871Z",
                "updatedAt": "2020-08-12T17:12:53.871Z",
                "__v": 0
            },
            {
                "_id": "5f34227972e9970d7e4d9d4c",
                "version": "0.1.3.14",
                "build_number": 14,
                "change_log": "Changes:\n- change #1\n- change #2\n- change #3",
                "file_name": "backupsettings.conf",
                "file_size": 22719,
                "md5_hash": "db7709d5c0c956eb664906e8ee97ee54",
                "createdAt": "2020-08-12T17:10:17.173Z",
                "updatedAt": "2020-08-12T17:10:17.173Z",
                "__v": 0
            },
            {
                "_id": "5f3423256ff6eb10334d1f5c",
                "version": "0.1.3.13",
                "build_number": 13,
                "change_log": "Changes:\n- change #1\n- change #2\n- change #3",
                "file_name": "javascript-new-toys-crowder.pdf",
                "file_size": 5453300,
                "md5_hash": "0ee8e174da6962b4bf146134fa6c39c0",
                "createdAt": "2020-08-12T17:13:09.593Z",
                "updatedAt": "2020-08-12T17:13:09.593Z",
                "__v": 0
            }
        ]
    }
}
```

### No releases

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": {
        "releases": []
    }
}
```


## Get the newest release

URL format:

```
http://host:port/release/newest
```

### Request

```shell script
curl -L -X GET 'http://127.0.0.1:3000/release/newest' \
-H 'Accept-Version: 1.0.0' \
-H 'accept-user: admin' \
-H 'Authorization: HsrSgitqSqsYdybqTpxj8c'
```

### Response on success

```json
{
    "statusCode": 200,
    "error": "Ok",
    "message": "Success",
    "data": {
        "release": {
            "_id": "5f342720ba536c1cc4224e5b",
            "version": "0.1.2.14",
            "build_number": 14,
            "change_log": "Some changes:\n- change #1\n- change #2",
            "file_name": "Domain-Driven_Design_Distilled_(2016).pdf",
            "file_size": 8994089,
            "md5_hash": "5cb8909c63b875649ebe642549ccec44",
            "createdAt": "2020-08-12T17:30:08.412Z",
            "updatedAt": "2020-08-12T17:30:08.412Z",
            "__v": 0
        }
    }
}
```

### Response on fail

```json
{
    "message": "Release not found",
    "statusCode": 400,
    "error": "Bad Request"
}
```