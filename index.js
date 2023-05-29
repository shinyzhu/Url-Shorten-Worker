const config = {
  no_ref: false, //Control the HTTP referrer header, if you want to create an anonymous link that will hide the HTTP Referer header, please set to "on" .
  cors: true, //Allow Cross-origin resource sharing for API requests.
  unique_link: true, //If it is true, the same long url will be shorten into the same short url
  custom_link: true, //Allow users to customize the short url.
  safe_browsing: false, //if true you need store your own Google Safe Browsing API Key to enable url safety check before redirect.
  default_redirect: "https://shinyzhu.com" //Redirect to this URL when visiting the default root page.
}

const html404 = `<!DOCTYPE html>
<html>
<head>
  <title>404 Not Found on shiny.im</title>
</head>
<body>
  <h1>404 Not Found.</h1>
  <p>The url you visit is not found on <a href="https://shiny.im">shiny.im</a>.</p>
  <hr />
</body>
</html>`

const html_safe_browsing = `
<!DOCTYPE html>
<html>
<head>
  <title>Safe Browsing</title>
</head>
<body>
  <h1>Safe Browsing</h1>
  <p>The URL you visit is at risk:</p>
  <p><u>{Replace}</u></p>
  <p>We will not automatically redirect to this url.</p>
</body>
</html>`

const html_no_ref = `
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting...</title>
  <meta http-equiv="Refresh" content="1; url={Replace}" />
	<meta name="referrer" content="no-referrer" />
</head>
<body>
	<p>Redirecting..</p>
  <p><a href="{Replace}">{Replace}</a></p>
	<script type="text/javascript">
	/* <![CDATA[ */
		setTimeout('window.location.replace( "{Replace}" + window.location.hash );', 1000 )
  /* ]]> */
	</script>
</body>
</html>`


let response_header = {
  "Content-Type": "text/html;charset=UTF-8",
}

if (config.cors) {
  response_header = {
    "Content-Type": "text/html;charset=UTF-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
  }
}

async function randomString(len) {
  len = len || 6;
  let $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
  let maxPos = $chars.length;
  let result = '';

  for (i = 0; i < len; i++) {
    result += $chars.charAt(Math.floor(Math.random() * maxPos));
  }

  return result;
}

async function sha512(url) {
  url = new TextEncoder().encode(url)

  const url_digest = await crypto.subtle.digest(
    {
      name: "SHA-512",
    },
    url, // The data you want to hash as an ArrayBuffer
  )
  const hashArray = Array.from(new Uint8Array(url_digest)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  //console.log(hashHex)
  return hashHex
}

async function checkURL(URL) {
  let str = URL;
  let Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  let objExp = new RegExp(Expression);
  if (objExp.test(str) == true) {
    if (str[0] == 'h')
      return true;
    else
      return false;
  } else {
    return false;
  }
}

async function save_url(URL) {
  let random_key = await randomString()
  let is_exist = await LINKS.get(random_key)
  console.log(is_exist)
  if (is_exist == null)
    return await LINKS.put(random_key, URL), random_key
  else
    save_url(URL)
}

async function is_url_exist(url_sha512) {
  let is_exist = await LINKS.get(url_sha512)
  console.log(is_exist)
  if (is_exist == null) {
    return false
  } else {
    return is_exist
  }
}

async function is_url_safe(url) {
  let raw = JSON.stringify({ "client": { "clientId": "Url-Shorten-Worker", "clientVersion": "1.0.7" }, "threatInfo": { "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "POTENTIALLY_HARMFUL_APPLICATION", "UNWANTED_SOFTWARE"], "platformTypes": ["ANY_PLATFORM"], "threatEntryTypes": ["URL"], "threatEntries": [{ "url": url }] } });

  let requestOptions = {
    method: 'POST',
    body: raw,
    redirect: 'follow'
  };

  // G_SAFE_BROWSING_APIKEY is stored in the cf env.
  result = await fetch("https://safebrowsing.googleapis.com/v4/threatMatches:find?key="+ G_SAFE_BROWSING_APIKEY, requestOptions)
  result = await result.json()
  console.log(result)
  if (Object.keys(result).length === 0) {
    return true
  } else {
    return false
  }
}

/* API */
async function handleRequest(request) {
  console.log(request)

  if (request.method === "POST") {
    let req = await request.json()
    console.log(req["url"])
    console.log(req["secret"])

    if (req["secret"] !== SECRET) {
      return new Response(`{"status":400, "key":": Error: Missing secret."}`, {
        headers: response_header,
        status: 400
      })
    }

    if (!await checkURL(req["url"])) {
      return new Response(`{"status":400, "key":": Error: Url illegal."}`, {
        headers: response_header,
        status: 400
      })
    }

    let stat, random_key
    if (config.unique_link) {
      let url_sha512 = await sha512(req["url"])
      let url_key = await is_url_exist(url_sha512)
      if (url_key) {
        random_key = url_key
      } else {
        stat, random_key = await save_url(req["url"])
        if (typeof (stat) == "undefined") {
          console.log(await LINKS.put(url_sha512, random_key))
        }
      }
    } else {
      stat, random_key = await save_url(req["url"])
    }
    
    console.log(stat)
    if (typeof (stat) == "undefined") {
      return new Response(`{"status":200, "key":"` + random_key + `"}`, {
        headers: response_header,
      })
    } else {
      return new Response(`{"status":200, "key":": Error:Reach the KV write limitation."}`, {
        headers: response_header,
      })
    }
  } else if (request.method === "OPTIONS") {
    return new Response(``, {
      headers: response_header,
    })

  }

  const requestURL = new URL(request.url)
  const path = requestURL.pathname.split("/")[1]
  const params = requestURL.search;

  console.log(path)

  if (!path) {
    return Response.redirect(config.default_redirect, 301);
  }

  const value = await LINKS.get(path);
  let location;

  if (params) {
    location = value + params
  } else {
    location = value
  }
  console.log(value)


  if (location) {
    if (config.safe_browsing) {
      if (!(await is_url_safe(location))) {
        let warning_page = html_safe_browsing
        warning_page = warning_page.replace(/{Replace}/gm, location)
        return new Response(warning_page, {
          headers: {
            "content-type": "text/html;charset=UTF-8",
          },
        })
      }
    }
    if (config.no_ref) {
      let no_ref = html_no_ref
      no_ref = no_ref.replace(/{Replace}/gm, location)
      return new Response(no_ref, {
        headers: {
          "content-type": "text/html;charset=UTF-8",
        },
      })
    } else {
      return Response.redirect(location, 302)
    }

  }
  // If request not in kv, return 404
  return new Response(html404, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
    status: 404
  })
}



addEventListener("fetch", async event => {
  event.respondWith(handleRequest(event.request))
})