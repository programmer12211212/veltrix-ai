import base64
import json
from urllib.request import Request, urlopen, urlretrieve
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
import tempfile
import os

import requests


def generate_image(prompt: str, ratio: str = "1:1", count: int = 1, upscale: int = 4) -> list:
    """
    Generate images using viscodev text-to-image API.
    Returns list of base64 encoded images.
    """
    if not prompt:
        raise ValueError("Prompt required for image generation")

    # Validate parameters
    valid_ratios = ["1:1", "9:16", "9:21", "3:4", "16:9", "4:3"]
    if ratio not in valid_ratios:
        ratio = "1:1"

    if count not in [1, 2, 3]:
        count = 1

    if upscale not in [1, 2, 3, 4]:
        upscale = 4

    url = 'https://viscodev.x10.mx/v-gen/api.php'
    params = {
        'prompt': prompt,
        'ratio': ratio,
        'count': str(count),
        'upscale': str(upscale)
    }
    full_url = f"{url}?{urlencode(params)}"

    request = Request(full_url, method='GET')

    try:
        with urlopen(request, timeout=60) as response:
            response_data = json.load(response)
    except HTTPError as exc:
        body = exc.read().decode('utf-8', errors='ignore')
        raise Exception(f'Viscodev request failed: {exc.code} {body}') from exc
    except URLError as exc:
        raise Exception(f'Viscodev request failed: {exc.reason}') from exc

    if not response_data.get('success'):
        raise Exception('Image generation failed: API returned success=false')

    images = response_data.get('images', [])
    if not images:
        raise Exception('Image generation failed: no images returned')

    # Download and encode images
    encoded_images = []
    for img_url in images:
        try:
            # Download to temp file
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_path = temp_file.name
                urlretrieve(img_url, temp_path)

            # Read and encode
            with open(temp_path, 'rb') as f:
                image_data = f.read()
            encoded = base64.b64encode(image_data).decode('utf-8')
            encoded_images.append(encoded)

            # Clean up
            os.unlink(temp_path)

        except Exception as exc:
            raise Exception(f'Failed to download/encode image: {exc}') from exc

    return encoded_images


def convert_to_anime(image_input, gender: str = "Female", style: str = "manga", ratio: str = "1:1") -> str:
    """
    Convert image to anime style using viscodev API.
    Accepts either a remote image URL or a file-like upload.
    Returns base64 encoded anime image.
    """
    if not image_input:
        raise ValueError("Image file or URL required for conversion")

    # Validate parameters
    valid_genders = ["Male", "Female"]
    if gender not in valid_genders:
        gender = "Female"

    valid_styles = ["dc_comics", "claymation", "cyberpunk", "pencil_anime", "pop_art", "cartoon_glamour", "bw_comic", "manga", "bright_realistic", "voxel", "fantasy_anime", "abstract_painting", "cartoon_poster", "cubist"]
    if style not in valid_styles:
        style = "manga"

    valid_ratios = ["auto", "1:1", "1:2", "2:1", "2:3", "3:2", "9:16", "16:9"]
    if ratio not in valid_ratios:
        ratio = "1:1"

    api_url = 'https://viscodev.x10.mx/image-an/api.php'
    response_data = None

    if hasattr(image_input, 'read'):
        file_content = image_input.read()
        filename = getattr(image_input, 'name', 'upload.png')
        content_type = getattr(image_input, 'content_type', 'application/octet-stream')

        try:
            resp = requests.post(
                api_url,
                files={'image': (filename, file_content, content_type)},
                data={'gender': gender, 'style': style, 'ratio': ratio},
                timeout=120
            )
            resp.raise_for_status()
            response_data = resp.json()
        except requests.HTTPError as exc:
            body = exc.response.text if exc.response is not None else str(exc)
            raise Exception(f'Viscodev anime request failed: {exc.response.status_code if exc.response is not None else "?"} {body}') from exc
        except requests.RequestException as exc:
            raise Exception(f'Viscodev anime request failed: {exc}') from exc
    else:
        if isinstance(image_input, str) and image_input.startswith('data:'):
            raise ValueError('Data URL not supported for anime conversion; upload a file instead.')

        params = {
            'links': image_input,
            'gender': gender,
            'style': style,
            'ratio': ratio
        }
        full_url = f"{api_url}?{urlencode(params)}"
        request = Request(full_url, method='GET')

        try:
            with urlopen(request, timeout=60) as response:
                response_data = json.load(response)
        except HTTPError as exc:
            body = exc.read().decode('utf-8', errors='ignore')
            raise Exception(f'Viscodev anime request failed: {exc.code} {body}') from exc
        except URLError as exc:
            raise Exception(f'Viscodev anime request failed: {exc.reason}') from exc

    if not response_data or not response_data.get('success'):
        api_error = response_data.get('error') if isinstance(response_data, dict) else None
        raise Exception(f'Anime conversion failed: {api_error or "API returned success=false"}')

    anime_url = response_data.get('image_url')
    if not anime_url:
        raise Exception('Anime conversion failed: no image URL returned')

    try:
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_path = temp_file.name
            urlretrieve(anime_url, temp_path)

        with open(temp_path, 'rb') as f:
            image_data = f.read()
        encoded = base64.b64encode(image_data).decode('utf-8')

        os.unlink(temp_path)
        return encoded
    except Exception as exc:
        raise Exception(f'Failed to download/encode anime image: {exc}') from exc

    except Exception as exc:
        raise Exception(f'Failed to download/encode anime image: {exc}') from exc