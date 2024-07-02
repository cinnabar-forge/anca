FROM docker.io/ubuntu:22.04

ENV NODE_VERSION 22.3.0
ENV NODE_CHECKSUM sha256:a6d4fbf4306a883b8e1d235a8a890be84b9d95d2d39b929520bed64da41ce540

RUN apt-get update \
  && apt-get install -y git tar gnupg2 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar -xz -f /node.tar.gz -C /usr/local --remove-files --strip-components=1

RUN useradd -m -s /bin/bash developer
USER developer
