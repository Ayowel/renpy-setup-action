ARG BASE_IMAGE=ubuntu
ARG BASE_IMAGE_VERSION=resolute
FROM $BASE_IMAGE:$BASE_IMAGE_VERSION

ARG NODE_VERSION=24
ARG SOURCE_JDK_21=https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jdk.deb
ARG SOURCE_JDK_8=https://corretto.aws/downloads/latest/amazon-corretto-8-x64-linux-jdk.deb
ARG ARG DEBIAN_FRONTEND=noninteractive

RUN apt update && \
    echo "Install Java 8 and Java 21 for testing" && \
    apt-get install --no-install-recommends -y curl ca-certificates gpg && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --batch --yes -o /usr/share/keyrings/nodesource.gpg && \
    chmod 644 /usr/share/keyrings/nodesource.gpg && \
    printf '%s\n' \
    'Types: deb' \
    "URIs: https://deb.nodesource.com/node_${NODE_VERSION}.x" \
    'Suites: nodistro' \
    'Components: main' \
    "Architectures: $(dpkg --print-architecture)" \
    'Signed-By: /usr/share/keyrings/nodesource.gpg' \
    | tee /etc/apt/sources.list.d/nodesource.sources > /dev/null && \
    apt update && \
    apt-get install --no-install-recommends -y nodejs && \
    echo "Install Java 8 and Java 21 for testing" && \
    curl -fsSL "${SOURCE_JDK_21}" -o /tmp/jdk.deb && \
    apt-get install --no-install-recommends -y /tmp/jdk.deb && \
    curl -fsSL "${SOURCE_JDK_8}" -o /tmp/jdk.deb && \
    apt-get install --no-install-recommends -y /tmp/jdk.deb && \
    rm /tmp/jdk.deb && \
    ln -s "$(basename "$(dirname "$(dirname "$(update-alternatives --list javac | grep 21 | head -1)")")")" /usr/lib/jvm/java-renpy-21 && \
    ln -s "$(basename "$(dirname "$(dirname "$(update-alternatives --list javac | grep 1.8 | head -1)")")")" /usr/lib/jvm/java-renpy-8 && \
    echo "Install unpacking dependencies" && \
    apt-get install --no-install-recommends -y lbzip2 unzip && \
    echo "Install Ren'Py runtime dependencies" && \
    apt-get install --no-install-recommends -y libgl1 && \
    rm -rf /var/lib/apt/lists /var/log/apt/* /var/log/dpkg.log

ENV JAVA_HOME8=/usr/lib/jvm/java-renpy-8
ENV JAVA_HOME21=/usr/lib/jvm/java-renpy-21
