

# API Documentation

Short links can be generated in a programmable way by calling the API endpoint.

## API Endpoint

It is the self-deployed Cloudflare Worker address, for example: https://url.dem0.workers.dev or your custom domain.

### 1. Shorten a long URL

Method: **POST**

Request and response data format: **JSON**

#### Example request:

````
{
	"url": "https://this_is_a_very_long_url.example.com?with=many&url=query&strings=yes",
	"secret": "your_secret"
}
````

#### Request data:

|Parameter Name|Type|Description|Required|Example|
| :----:| :----: | :----: | :----: | :----: |
| url | string | URL (must include http:// or https://) | YES | https://example.com|
| secret | string | Your own secret to protect the API | YES | N/A |

#### Example Response:

````
{
    "status": 200,
    "key": "demo"
}
````

#### Response data:
|Parameter Name|Type|Description|Example|
| :----:| :----: | :----: | :----: |
|status|int| Status code: 200 is a successful call |200|
|key|string| Short link suffix: you need to add the domain name prefix|xxxxxx|

> Note: The interface will only return the key value corresponding to the short link. In actual use, the corresponding domain name prefix needs to be added by yourself.

