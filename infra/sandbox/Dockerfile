FROM ubuntu:24.04 AS nsjail-build

ARG DEBIAN_FRONTEND=noninteractive
ARG NSJAIL_GIT_URL=https://github.com/google/nsjail.git
# Pin this to a tag/commit you trust (e.g. v3.2 or a full SHA) for supply-chain safety.
ARG NSJAIL_GIT_REF=3.2

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    make \
    g++ \
    pkg-config \
    flex \
    bison \
    protobuf-compiler \
    libprotobuf-dev \
    libnl-3-dev \
    libnl-route-3-dev \
    libcap-dev \
    libseccomp-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 --branch "${NSJAIL_GIT_REF}" "${NSJAIL_GIT_URL}" nsjail
WORKDIR /src/nsjail
RUN make -j"$(nproc)"

FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    coreutils \
    gcc \
    g++ \
    make \
    python3 \
    python3-pip \
    openjdk-21-jdk-headless \
    # Linter tools
    clang-tidy \
    # nsjail runtime dependencies
    libprotobuf32t64 \
    libnl-3-200 \
    libnl-route-3-200 \
  && rm -rf /var/lib/apt/lists/* \
  && pip3 install --no-cache-dir --break-system-packages pylint

RUN groupadd -g 10001 sandbox && useradd -m -u 10001 -g 10001 -s /usr/sbin/nologin sandbox

# Create /work and subdirectories for bind mounts (required for --read-only mode)
RUN mkdir -p /work/src /work/build /work/out /work/testdata \
    && chown -R 10001:10001 /work \
    && chmod 0777 /work /work/src /work/build /work/out /work/testdata

WORKDIR /work


COPY --from=nsjail-build /src/nsjail/nsjail /usr/local/bin/nsjail
COPY bin/noj-sandbox /usr/local/bin/noj-sandbox
RUN chmod 0555 /usr/local/bin/nsjail /usr/local/bin/noj-sandbox

ENV NOJ_SANDBOX_WORKDIR=/work

ENTRYPOINT ["/usr/local/bin/noj-sandbox"]

