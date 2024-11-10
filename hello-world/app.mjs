import childProcess from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import stream from "stream";
import util from "util";

const pipeline = util.promisify(stream.pipeline);

async function downloadFile(url, filePath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    stream.Readable.fromWeb(response.body).on("error", reject).pipe(fileStream);
    fileStream.on("finish", resolve);
  });
}

async function asError(responseStream, code, body) {
  console.error({ code, body });

  const metadata = {
    statusCode: code,
    headers: {
      "Content-Type": "application/json",
    },
  };

  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  const requestStream = stream.Readable.from(Buffer.from(JSON.stringify(body)));
  await pipeline(requestStream, responseStream);
}

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const lambdaHandler = awslambda.streamifyResponse(
  async (event, responseStream, _context) => {
    const queryParameters = event.queryStringParameters || {};

    const inputExtension = queryParameters["inputExtension"] || "mp3";
    const outputExtension = queryParameters["outputExtension"] || "mp3";
    const outputBitrate = queryParameters["outputBitrate"] || "96";

    if (isNaN(outputBitrate)) {
      return await asError(responseStream, 400, {
        message: "`outputBitrate` must be a number",
      });
    }

    const fileUrl = queryParameters["fileUrl"];
    if (!fileUrl) {
      return await asError(responseStream, 400, {
        message: "`fileUrl` query parameter not specified",
      });
    }

    const ffmpegPath = "/opt/bin/ffmpeg";
    if (!fs.existsSync(ffmpegPath)) {
      return await asError(responseStream, 500, {
        message: "ffmpeg not installed",
      });
    }

    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "lambda-")
    );
    const temporaryInputFilePath = path.join(
      temporaryDirectory,
      `input.${inputExtension}`
    );
    const temporaryOutputFilePath = path.join(
      temporaryDirectory,
      `output.${outputExtension}`
    );

    try {
      await downloadFile(fileUrl, temporaryInputFilePath);

      const ffmpegCommand = [
        ffmpegPath,
        "-y",
        "-i",
        temporaryInputFilePath,
        "-map",
        "0:a:0",
        "-b:a",
        `${outputBitrate}k`,
        temporaryOutputFilePath,
      ];

      const ffmpeg = childProcess.execFile(ffmpegPath, ffmpegCommand.slice(1));
      ffmpeg.stdout.pipe(process.stdout);
      ffmpeg.stderr.pipe(process.stderr);

      await new Promise((resolve, reject) => {
        ffmpeg.on("exit", (code) => {
          if (code == 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg exited with code ${code}`));
          }
        });
      });

      const metadata = {
        statusCode: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": 'attachment; filename="output.mp3"',
        },
      };

      responseStream = awslambda.HttpResponseStream.from(
        responseStream,
        metadata
      );

      const fileStream = fs.createReadStream(temporaryOutputFilePath);
      // const fileStream = fs.createReadStream(temporaryOutputFilePath);

      await pipeline(fileStream, responseStream);
    } catch (error) {
      console.error(error);

      return await asError(responseStream, 500, {
        message: error.message || String(error),
      });
    } finally {
      for (const path of [temporaryInputFilePath, temporaryOutputFilePath]) {
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
        }
      }
    }
  }
);
