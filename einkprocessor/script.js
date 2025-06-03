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
//canvas.style.outline = "2px solid red";
let ctx = canvas.getContext('2d');
let originalImage = null;
let originalFilename = '';
const cropRegion = document.getElementById('cropRegion');
const aspectWidthInput = document.getElementById('aspectWidth');
const aspectHeightInput = document.getElementById('aspectHeight');

let startX, startY, isDragging = false, isResizing = false, resizeDirection = '';
let initialX, initialY;

let canvasOffsetX = 0;
let canvasOffsetY = 0;
let canvasScale = 1;
let canvasRect = null;
let canvasScaleX = 1;
let canvasScaleY = 1;

// Add these at the top of your script
let canvasPosition = { left: 0, top: 0 };
let canvasDisplaySize = { width: 0, height: 0 };

function startCropMode() {
    if (!originalImage) {
        alert('Please load an image first');
        return;
    }

    updateCanvasPosition();

    const aspectWidth = parseInt(aspectWidthInput.value, 10);
    const aspectHeight = parseInt(aspectHeightInput.value, 10);
    const aspectRatio = aspectWidth / aspectHeight;

    const displayWidth = canvasDisplaySize.width;
    const displayHeight = canvasDisplaySize.height;

    let cropDisplayWidth = displayWidth * 0.5; // Use 50% of canvas width
    let cropDisplayHeight = cropDisplayWidth / aspectRatio;

    if (cropDisplayHeight > displayHeight) {
        cropDisplayHeight = displayHeight * 0.5;
        cropDisplayWidth = cropDisplayHeight * aspectRatio;
    }

	const cropLeft = canvasPosition.left + (displayWidth - cropDisplayWidth) / 2;
	const cropTop = canvasPosition.top + (displayHeight - cropDisplayHeight) / 2;

    cropRegion.style.width = `${cropDisplayWidth}px`;
    cropRegion.style.height = `${cropDisplayHeight}px`;
    
	cropRegion.style.left = `${cropLeft}px`;
	cropRegion.style.top = `${cropTop}px`;
    cropRegion.style.display = 'block';

    cropRegion.addEventListener('mousedown', startMove);
    document.querySelectorAll('.resizer').forEach(resizer => {
        resizer.addEventListener('mousedown', startResize);
    });
    document.addEventListener('mousemove', drawCropRegion);
    document.addEventListener('mouseup', stopCrop);
    document.addEventListener('scroll', updateCanvasPosition);
    window.addEventListener('resize', updateCanvasPosition);
}

function startMove(event) {
    if (event.target.classList.contains('resizer')) return;
    
    startX = event.clientX;
    startY = event.clientY;
    initialX = parseInt(cropRegion.style.left, 10);
    initialY = parseInt(cropRegion.style.top, 10);
    isDragging = true;
    event.preventDefault();
}

function startResize(event) {
    isResizing = true;
    resizeDirection = event.target.dataset.resize; // Get the resize direction
    event.stopPropagation();
}

function drawCropRegion(event) {
    if (isDragging) {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        
        let newLeft = initialX + dx;
        let newTop = initialY + dy;
        
        // Constrain to canvas bounds
        const maxLeft = canvasPosition.left + canvasDisplaySize.width - parseInt(cropRegion.style.width);
        const maxTop = canvasPosition.top + canvasDisplaySize.height - parseInt(cropRegion.style.height);
        
        newLeft = Math.max(canvasPosition.left, Math.min(newLeft, maxLeft));
        newTop = Math.max(canvasPosition.top, Math.min(newTop, maxTop));
        
        cropRegion.style.left = `${newLeft}px`;
        cropRegion.style.top = `${newTop}px`;
    } else if (isResizing) {
        const rect = cropRegion.getBoundingClientRect();
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        const aspectRatio = parseInt(aspectWidthInput.value) / parseInt(aspectHeightInput.value);
        let newWidth, newHeight;

        switch(resizeDirection) {
            case 'se':
                newWidth = mouseX - rect.left;
                newHeight = newWidth / aspectRatio;
                break;
            case 'sw':
                newWidth = rect.right - mouseX;
                newHeight = newWidth / aspectRatio;
                cropRegion.style.left = `${rect.left + (rect.width - newWidth)}px`;
                break;
            case 'ne':
                newHeight = rect.bottom - mouseY;
                newWidth = newHeight * aspectRatio;
                cropRegion.style.top = `${rect.top + (rect.height - newHeight)}px`;
                break;
            case 'nw':
                newWidth = rect.right - mouseX;
                newHeight = newWidth / aspectRatio;
                cropRegion.style.left = `${rect.left + (rect.width - newWidth)}px`;
                cropRegion.style.top = `${rect.top + (rect.height - newHeight)}px`;
                break;
        }

        // Constrain dimensions
        const maxWidth = (canvasPosition.left + canvasDisplaySize.width) - parseInt(cropRegion.style.left);
        const maxHeight = (canvasPosition.top + canvasDisplaySize.height) - parseInt(cropRegion.style.top);
        
        newWidth = Math.max(10, Math.min(newWidth, maxWidth));
        newHeight = Math.max(10, Math.min(newHeight, maxHeight));

        // Maintain aspect ratio
        if (newWidth / newHeight > aspectRatio) {
            newHeight = newWidth / aspectRatio;
        } else {
            newWidth = newHeight * aspectRatio;
        }

        cropRegion.style.width = `${newWidth}px`;
        cropRegion.style.height = `${newHeight}px`;
    }
}

function stopCrop() {
    isDragging = false;
    isResizing = false;
}

function cropImage() {
    updateCanvasPosition(); // Refresh canvas position
    
    // Calculate scale factors
    const scaleX = canvasDisplaySize.width / canvas.width;
    const scaleY = canvasDisplaySize.height / canvas.height;

    // Convert screen coordinates to image coordinates
    const cropLeft = (parseInt(cropRegion.style.left) - canvasPosition.left) / scaleX;
    const cropTop = (parseInt(cropRegion.style.top) - canvasPosition.top) / scaleY;
    const cropWidth = parseInt(cropRegion.style.width) / scaleX;
    const cropHeight = parseInt(cropRegion.style.height) / scaleY;

    const aspectWidth = parseInt(aspectWidthInput.value, 10);
    const aspectHeight = parseInt(aspectHeightInput.value, 10);

    // Get the cropped image data with boundary checks
    const safeLeft = Math.max(0, Math.min(cropLeft, canvas.width - 1));
    const safeTop = Math.max(0, Math.min(cropTop, canvas.height - 1));
    const safeWidth = Math.min(cropWidth, canvas.width - safeLeft);
    const safeHeight = Math.min(cropHeight, canvas.height - safeTop);

    const croppedImageData = ctx.getImageData(safeLeft, safeTop, safeWidth, safeHeight);

    // Create final canvas
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    finalCanvas.width = aspectWidth;
    finalCanvas.height = aspectHeight;

    // Calculate scaling
    const scale = Math.min(
        aspectWidth / croppedImageData.width,
        aspectHeight / croppedImageData.height
    );

    // Calculate offset for centering
    const offsetX = (aspectWidth - croppedImageData.width * scale) / 2;
    const offsetY = (aspectHeight - croppedImageData.height * scale) / 2;

    // Draw scaled image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = croppedImageData.width;
    tempCanvas.height = croppedImageData.height;
    tempCanvas.getContext('2d').putImageData(croppedImageData, 0, 0);
    
    finalCtx.drawImage(tempCanvas, 0, 0, croppedImageData.width, croppedImageData.height,
                      offsetX, offsetY, croppedImageData.width * scale, croppedImageData.height * scale);

    // Update main canvas
    canvas.width = aspectWidth;
    canvas.height = aspectHeight;
    canvas.style.width = `${aspectWidth}px`;
    canvas.style.height = `${aspectHeight}px`;
    ctx.drawImage(finalCanvas, 0, 0);
    originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Reset
    resetCrop();
    document.removeEventListener('scroll', updateCanvasPosition);
    window.removeEventListener('resize', updateCanvasPosition);
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

// Update the loadImage function to calculate canvas position
function loadImage(event) {
    const file = event.target.files[0];
    originalFilename = file.name.replace(/\.[^/.]+$/, "");
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Set canvas to original image dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Calculate display size (maintain aspect ratio)
            const maxDisplayWidth = window.innerWidth * 0.8;
            const maxDisplayHeight = window.innerHeight * 0.6;
            const scale = Math.min(
                maxDisplayWidth / img.width,
                maxDisplayHeight / img.height,
                1
            );
            
            canvas.style.width = `${img.width * scale}px`;
            canvas.style.height = `${img.height * scale}px`;
            
            // Store canvas position and display size
            updateCanvasPosition();
            
            ctx.drawImage(img, 0, 0);
            originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function updateCanvasPosition() {
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = canvas.parentElement.getBoundingClientRect();

    canvasPosition = {
        left: canvasRect.left - containerRect.left,
        top: canvasRect.top - containerRect.top
    };
    canvasDisplaySize = {
        width: canvasRect.width,
        height: canvasRect.height
    };
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
