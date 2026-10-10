#!/usr/bin/env bash
# Render build step: install packages, collect admin static files, apply database migrations.
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
