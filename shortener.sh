# Check if argument is provided
if [ $# -eq 0 ]
  then
    echo "No URL provided"
    echo "shortener.sh <URL>"
    exit 1
fi

# Send curl request
data='{"url": "'"$1"'","secret": "your_own_secret"}'

curl -X POST -d "$data" shiny.im

