from setuptools import setup, find_packages

setup(
    name="lib2b",
    version="0.1.0",
    description="The protocol layer for B2B AI — unified SDK for MCP, A2A, ACP, libp2p, and ABCI",
    author="CSOAI <dev@csoai.org>",
    license="MIT",
    packages=find_packages(),
    install_requires=["requests>=2.28.0"],
    python_requires=">=3.9",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
