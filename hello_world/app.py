import json
import shutil
import tempfile
import os
import subprocess
import base64

import requests


def download_file(url: str, path: str):
    with requests.get(url, stream=True) as response:
        response.raise_for_status()

        with open(path, 'wb') as fd:
            for chunk in response.iter_content(chunk_size=8192):
                fd.write(chunk)


def lambda_handler(event, context):
    """Sample pure Lambda function

    Parameters
    ----------
    event: dict, required
        API Gateway Lambda Proxy Input Format

        Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

    context: object, required
        Lambda Context runtime methods and attributes

        Context doc: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Returns
    ------
    API Gateway Lambda Proxy Output Format: dict

        Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
    """

    query_parameters = event.get("queryStringParameters") or {}

    input_extension = query_parameters.get("input_extension", "mp3")
    output_extension = query_parameters.get("output_extension", "mp3")
    output_extension = query_parameters.get("output_extension", "mp3")

    # https://file-examples.com/storage/fe504ae8c8672e49a9e2d51/2017/11/file_example_MP3_5MG.mp3
    file_url = query_parameters.get("file_url")
    if not file_url:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "message": "`file_url` query parameter not specified",
            }),
        }
    
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "ffmpeg not installed",
            }),
        }

    with tempfile.TemporaryDirectory() as temporary_directory_path:
        temporary_input_file_path = os.path.join(temporary_directory_path, f"input.{input_extension}")
        temporary_output_file_path = os.path.join(temporary_directory_path, f"output.{output_extension}")

        try:
            download_file(file_url, temporary_input_file_path)
        except requests.exceptions.HTTPError as error:
            return {
                "statusCode": 500,
                "body": json.dumps({
                    "message": "file could not be downloaded",
                    "error": str(error)
                }),
            }

        process = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                temporary_input_file_path,
                "-map",
                "0:a:0",
                "-b:a",
                "96k",
                temporary_output_file_path,
            ],
        )

        return_code = process.returncode
        if return_code != 0:
            return {
                "statusCode": 500,
                "body": json.dumps({
                    "message": "ffmpeg failed",
                    "returnCode": return_code,
                }),
            }

        with open(temporary_output_file_path, "rb") as fd:
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": 'attachment; filename="output.mp3"',
                },
                "isBase64Encoded": True,
                "body": base64.encodebytes(fd.read()),
            }
