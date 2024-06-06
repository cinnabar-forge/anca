FROM docker.io/ubuntu:22.04

ENV NODE_VERSION 22.2.0
ENV NODE_CHECKSUM sha256:2c6eaf8bfd0f886ed8764ffce19c795e909639105e4056b1d9f8f917bad12cf1

RUN apt-get update \
  && apt-get install -y git tar gnupg2 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
ADD --checksum=$NODE_CHECKSUM https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz /node.tar.gz
RUN tar -xz -f /node.tar.gz -C /usr/local --remove-files --strip-components=1

RUN useradd -m -s /bin/bash developer
USER developer
