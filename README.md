# audio-compress-endpoint

A simple lambda that asks for a file url and converts it to a lower quality mp3.

| Parameters        | Default Value | Description                                   |
| ----------------- | ------------- | --------------------------------------------- |
| `inputExtension`  | `mp3`         | The extension of the input file.              |
| `outputExtension` | `mp3`         | The extension of the output file.             |
| `outputBitrate`   | `96`          | The new bitrate to convert the input file to. |
| `fileUrl`         |               | The URL of the file to convert.               |

# Deployment

See [AWS_README.md](./AWS_README.md).