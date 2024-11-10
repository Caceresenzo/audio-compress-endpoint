# audio-compress-endpoint

A simple lambda that asks for a file url and converts it to a lower quality mp3.

| Parameters        | Default Value | Description                                   |
| ----------------- | ------------- | --------------------------------------------- |
| `inputExtension`  | `mp3`         | The extension of the input file.              |
| `outputExtension` | `mp3`         | The extension of the output file.             |
| `outputBitrate`   | `96`          | The new bitrate to convert the input file to. |
| `fileUrl`         |               | The URL of the file to convert.               |

# Deployment

## Requirements

- Deploy the [ffmpeg-lambda-layer](https://serverlessrepo.aws.amazon.com/applications/us-east-1/145266761615/ffmpeg-lambda-layer) to your AWS account.

## Configure

- Rename the `.env.example` to `.env
- Change the value of `FfmpegLayerArn` to your deployed arn.

## Commands

- Do `make deploy`

For more information, see [AWS_README.md](./AWS_README.md).

## Use

After running `make deploy`, you should see
```
Key                 HelloWorldApi
Description         Lambda endpoint URL for Hello World function
Value               https://abcdefghijklmnopqrstuvwxyz012345.lambda-url.us-east-1.on.aws/
```

To use the API, you must use this URL with a few query parameters:
```
https://abcdefghijklmnopqrstuvwxyz012345.lambda-url.us-east-1.on.aws/
    ?fileUrl=http://example.com/file.mp3
    &outputBitrate=16
```

## Destroy

- Do `make delete`

# Credits

- [Sample .mp3 download](https://file-examples.com/index.php/sample-audio-files/sample-mp3-download/)
