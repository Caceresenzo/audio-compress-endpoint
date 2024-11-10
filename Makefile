Region ?= us-east-1

include .env
export

deploy:
	sam deploy --parameter-overrides FfmpegLayerArn=$(FfmpegLayerArn)

sync:
	sam sync --watch --region $(Region) --parameter-overrides FfmpegLayerArn=$(FfmpegLayerArn)

delete:
	sam delete
