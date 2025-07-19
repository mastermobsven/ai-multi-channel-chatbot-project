#!/usr/bin/env python3
"""
Setup script for the Memory Engine Client
"""

from setuptools import setup, find_packages

setup(
    name="memory-engine-client",
    version="1.0.0",
    description="Client library for the AI Customer Support Platform Memory Engine",
    author="AI Customer Support Platform Team",
    author_email="support@example.com",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.23.0",
        "python-dotenv>=1.0.0",
    ],
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
)
