document.getElementById('imageInput').addEventListener('change', loadImage);
document.getElementById('contrastSlider').addEventListener('input', adjustContrast);
document.getElementById('grayscaleButton').addEventListener('click', convertToGrayscale);
document.getElementById('binarizeButton').addEventListener('click', applySierraBinarization);
document.getElementById('brightnessSlider').addEventListener('input', adjustBrightness);
document.getElementById('saveButton').addEventListener('click', saveImage);
document.getElementById('startCropButton').addEventListener('click', startCropMode);
document.getElementById('confirmCropButton').addEventListener('click', cropImage);
document.getElementById('resetCropButton').addEventListener('click', resetCrop);

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let originalImage = null;
let originalFilename = '';
const cropRegion = document.getElementById('cropRegion');
const aspectWidthInput = document.getElementById('aspectWidth');
const aspectHeightInput = document.getElementById('aspectHeight');

let startX, startY, isDragging = false, isResizing = false, resizeDirection = '';
let initialX, initialY;

function startCropMode() {
    const aspectWidth = parseInt(aspectWidthInput.value, 10);
    const aspectHeight = parseInt(aspectHeightInput.value, 10);

    // Set initial crop region size and position
    cropRegion.style.width = `${aspectWidth}px`;
    cropRegion.style.height = `${aspectHeight}px`;

    // Center the crop region within the canvas
    cropRegion.style.left = `${(canvas.width - aspectWidth) / 2}px`;
    cropRegion.style.top = `${(canvas.height - aspectHeight) / 2}px`;

    // Make sure crop region is visible
    cropRegion.style.display = 'block';

    // Add event listeners
    cropRegion.addEventListener('mousedown', startMove);
    cropRegion.querySelector('.resizer').addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', drawCropRegion);
    document.addEventListener('mouseup', stopCrop);
}

function startMove(event) {
    if (event.target === cropRegion.querySelector('.resizer')) return; // Ignore if resizing
    startX = event.clientX;
    startY = event.clientY;
    initialX = parseInt(cropRegion.style.left, 10);
    initialY = parseInt(cropRegion.style.top, 10);
    isDragging = true;
    event.stopPropagation();
}

function startResize(event) {
    isResizing = true;
    resizeDirection = event.target.dataset.resize; // Get the resize direction
    event.stopPropagation();
}

function drawCropRegion(event) {
    if (isDragging) {
        let dx = event.clientX - startX;
        let dy = event.clientY - startY;
        
        let newLeft = initialX + dx;
        let newTop = initialY + dy;
        
        // Ensure the crop region stays within canvas bounds
        const maxX = canvas.width - parseInt(cropRegion.style.width, 10);
        const maxY = canvas.height - parseInt(cropRegion.style.height, 10);
        
        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));
        
        cropRegion.style.left = `${newLeft}px`;
        cropRegion.style.top = `${newTop}px`;
    } else if (isResizing) {
        const aspectWidth = parseInt(aspectWidthInput.value, 10);
        const aspectHeight = parseInt(aspectHeightInput.value, 10);
        const rect = cropRegion.getBoundingClientRect();
        
        let newWidth = event.clientX - rect.left;
        let newHeight = event.clientY - rect.top;

        // Calculate new dimensions maintaining aspect ratio
        if (resizeDirection === 'se') {
            if (newWidth / newHeight > aspectWidth / aspectHeight) {
                newWidth = newHeight * (aspectWidth / aspectHeight);
            } else {
                newHeight = newWidth * (aspectHeight / aspectWidth);
            }
        } else if (resizeDirection === 'sw') {
            if (newWidth / newHeight > aspectWidth / aspectHeight) {
                newWidth = newHeight * (aspectWidth / aspectHeight);
            } else {
                newHeight = newWidth * (aspectHeight / aspectWidth);
            }
            cropRegion.style.left = `${rect.left - (newWidth - rect.width)}px`;
        } else if (resizeDirection === 'ne') {
            if (newWidth / newHeight > aspectWidth / aspectHeight) {
                newHeight = newWidth * (aspectHeight / aspectWidth);
            } else {
                newWidth = newHeight * (aspectWidth / aspectHeight);
            }
        } else if (resizeDirection === 'nw') {
            if (newWidth / newHeight > aspectWidth / aspectHeight) {
                newHeight = newWidth * (aspectHeight / aspectWidth);
            } else {
                newWidth = newHeight * (aspectWidth / aspectHeight);
            }
            cropRegion.style.left = `${rect.left - (newWidth - rect.width)}px`;
            cropRegion.style.top = `${rect.top - (newHeight - rect.height)}px`;
        }
        
        // Ensure the crop region stays within canvas bounds and does not exceed the canvas size
        newWidth = Math.min(Math.max(aspectWidth/100, newWidth), canvas.width - parseInt(cropRegion.style.left, 10));
        newHeight = Math.min(Math.max(aspectHeight/100, newHeight), canvas.height - parseInt(cropRegion.style.top, 10));
        
        cropRegion.style.width = `${newWidth}px`;
        cropRegion.style.height = `${newHeight}px`;
    }
}

function stopCrop() {
    isDragging = false;
    isResizing = false;
}

function cropImage() {
    const aspectWidth = parseInt(aspectWidthInput.value, 10);
    const aspectHeight = parseInt(aspectHeightInput.value, 10);
    const cropX = parseInt(cropRegion.style.left, 10);
    const cropY = parseInt(cropRegion.style.top, 10);
    const cropWidth = parseInt(cropRegion.style.width, 10);
    const cropHeight = parseInt(cropRegion.style.height, 10);

    // Get the cropped image data
    const croppedImageData = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);

    // Create a temporary canvas to handle scaling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Set temporary canvas size to the aspect ratio
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;

    // Draw the cropped image data onto the temporary canvas
    tempCtx.putImageData(croppedImageData, 0, 0);

    // Create a new canvas to draw the final image with the aspect ratio
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    finalCanvas.width = aspectWidth;
    finalCanvas.height = aspectHeight;

    // Calculate scaling factors
    const scaleX = aspectWidth / cropWidth;
    const scaleY = aspectHeight / cropHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate the offset for centering
    const offsetX = (aspectWidth - cropWidth * scale) / 2;
    const offsetY = (aspectHeight - cropHeight * scale) / 2;

    // Scale the image and draw it on the final canvas
    finalCtx.drawImage(tempCanvas, 0, 0, cropWidth, cropHeight, offsetX, offsetY, cropWidth * scale, cropHeight * scale);

    // Clear the main canvas and draw the scaled image
    canvas.width = aspectWidth;
    canvas.height = aspectHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(finalCanvas, 0, 0);
	
	// Update the originalImage to the cropped and scaled image
    originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
	
	
}

function resetCrop() {
    cropRegion.style.display = 'none';
    cropRegion.style.left = '0px';
    cropRegion.style.top = '0px';
    cropRegion.style.width = '0px';
    cropRegion.style.height = '0px';
    document.removeEventListener('mousemove', drawCropRegion);
    document.removeEventListener('mouseup', stopCrop);
}





document.getElementById('saveAsTxtButton').addEventListener('click', function() {
    const scanDirection = document.querySelector('input[name="scanDirection"]:checked').value;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let hexArray = '';

    if (scanDirection === 'horizontal') {
        for (let y = 0; y < canvas.height; y++) {
            let byte = 0;
            let byteString = '0x';

            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                const isWhite = data[index] > 128;  // Assuming grayscale

                byte = (byte << 1) | (isWhite ? 0 : 1);

                if ((x + 1) % 8 === 0 || x === canvas.width - 1) {
                    byteString += byte.toString(16).padStart(2, '0');
                    hexArray += `${byteString}, `;
                    byte = 0;
                    byteString = '0x';
                }
            }
            hexArray += '\n';
        }
    } else {  // vertical
        for (let x = 0; x < canvas.width; x++) {
            let byte = 0;
            let byteString = '0x';

            for (let y = 0; y < canvas.height; y++) {
                const index = (y * canvas.width + x) * 4;
                const isWhite = data[index] > 128;  // Assuming grayscale

                byte = (byte << 1) | (isWhite ? 0 : 1);

                if ((y + 1) % 8 === 0 || y === canvas.height - 1) {
                    byteString += byte.toString(16).padStart(2, '0');
                    hexArray += `${byteString}, `;
                    byte = 0;
                    byteString = '0x';
                }
            }
            hexArray += '\n';
        }
    }

    const textFileContent = `const uint8_t image[] = {\n${hexArray}\n};`;
    const blob = new Blob([textFileContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = `${originalFilename}_image.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
});

function loadImage(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function saveImage() {
    const link = document.createElement('a');
    link.download = 'processed_image.png';
    link.href = canvas.toDataURL();
    link.click();
}

function adjustBrightness() {
    if (!originalImage) return;

    const brightness = parseInt(document.getElementById('brightnessSlider').value);
    const imageData = new ImageData(new Uint8ClampedArray(originalImage.data), originalImage.width, originalImage.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = truncate(data[i] + brightness);
        data[i + 1] = truncate(data[i + 1] + brightness);
        data[i + 2] = truncate(data[i + 2] + brightness);
    }

    ctx.putImageData(imageData, 0, 0);
}

function adjustContrast() {
    if (!originalImage) return;

    const contrast = parseInt(document.getElementById('contrastSlider').value);
    const imageData = new ImageData(new Uint8ClampedArray(originalImage.data), originalImage.width, originalImage.height);
    const data = imageData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        data[i] = truncate(factor * (data[i] - 128) + 128);
        data[i + 1] = truncate(factor * (data[i + 1] - 128) + 128);
        data[i + 2] = truncate(factor * (data[i + 2] - 128) + 128);
    }
    ctx.putImageData(imageData, 0, 0);
}

function truncate(value) {
    return Math.min(255, Math.max(0, value));
}

function convertToGrayscale() {
    if (!originalImage) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        data[i] = data[i + 1] = data[i + 2] = grayscale;
    }

    ctx.putImageData(imageData, 0, 0);
}

function applySierraBinarization() {
    if (!originalImage) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const oldPixel = data[index];
            const newPixel = oldPixel < 128 ? 0 : 255;
            const quantError = oldPixel - newPixel;

            data[index] = data[index + 1] = data[index + 2] = newPixel;

            distributeError(data, x + 1, y, canvas.width, quantError * 5 / 32);
            distributeError(data, x + 2, y, canvas.width, quantError * 3 / 32);
            distributeError(data, x - 1, y + 1, canvas.width, quantError * 2 / 32);
            distributeError(data, x, y + 1, canvas.width, quantError * 4 / 32);
            distributeError(data, x + 1, y + 1, canvas.width, quantError * 5 / 32);
            distributeError(data, x + 2, y + 1, canvas.width, quantError * 2 / 32);
            distributeError(data, x - 1, y + 2, canvas.width, quantError * 2 / 32);
            distributeError(data, x, y + 2, canvas.width, quantError * 3 / 32);
            distributeError(data, x + 1, y + 2, canvas.width, quantError * 2 / 32);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function distributeError(data, x, y, width, error) {
    if (x < 0 || x >= width || y < 0 || y >= canvas.height) return;
    const index = (y * width + x) * 4;
    data[index] = truncate(data[index] + error);
    data[index + 1] = truncate(data[index + 1] + error);
    data[index + 2] = truncate(data[index + 2] + error);
}