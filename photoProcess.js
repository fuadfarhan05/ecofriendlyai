<script>
    document.getElementById('imageUpload').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 1. Show Original Image & File Size
        const originalUrl = URL.createObjectURL(file);
        const origImgElement = document.getElementById('originalImagePreview');
        origImgElement.src = originalUrl;
        origImgElement.style.display = 'inline-block';
        
        const originalKb = (file.size / 1024).toFixed(1);

        // 2. Process through our Eco-Math Logic
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const MAX_EDGE = 512; // Forces AI into 1 compute tile
                let width = img.width;
                let height = img.height;

                // Calculate Original Tokens (170 tokens per 512x512 tile)
                let originalTiles = Math.ceil(width / 512) * Math.ceil(height / 512);
                let originalTokens = originalTiles * 170;

                // Document Original Stats
                document.getElementById('originalStats').innerHTML = `
                    Dimensions: <b>${width} x ${height}px</b><br>
                    Estimated Tokens: <b>${originalTokens}</b><br>
                    Payload Size: <b>${originalKb} KB</b>
                `;

                // Calculate Downscale Math
                if (width > MAX_EDGE || height > MAX_EDGE) {
                    if (width > height) {
                        height = Math.floor((height / width) * MAX_EDGE);
                        width = MAX_EDGE;
                    } else {
                        width = Math.floor((width / height) * MAX_EDGE);
                        height = MAX_EDGE;
                    }
                }

                // Draw to Canvas to compress and strip EXIF metadata
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Get New Image Payload (0.8 quality JPEG)
                const ecoImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                
                // Calculate New Size in KB roughly
                const ecoSizeKb = Math.round((ecoImageBase64.length * 3 / 4) / 1024);

                // Show Optimized Image
                const ecoImgElement = document.getElementById('ecoImagePreview');
                ecoImgElement.src = ecoImageBase64;
                ecoImgElement.style.display = 'inline-block';

                // Optimized Tokens are capped at 1 tile (170)
                let optimizedTokens = 170; 
                let tokensSaved = Math.max(0, originalTokens - optimizedTokens);
                
                // Formula: 1 token = ~0.015 ml of water
                let waterSavedMl = (tokensSaved * 0.015).toFixed(2);

                // Document Eco Stats
                document.getElementById('ecoStats').innerHTML = `
                    Dimensions: <b>${width} x ${height}px</b><br>
                    Estimated Tokens: <b>${optimizedTokens}</b><br>
                    Payload Size: <b>~${ecoSizeKb} KB</b>
                `;

                // Show Water Alert
                const alertBox = document.getElementById('waterAlert');
                alertBox.style.display = 'block';
                if (tokensSaved > 0) {
                    alertBox.innerHTML = `🎉 You saved <b>${waterSavedMl} ml</b> of fresh water! (${tokensSaved} tokens bypassed)`;
                } else {
                    alertBox.innerHTML = `✅ Image was already small enough! No extra compute wasted.`;
                    alertBox.style.backgroundColor = '#e2e3e5';
                    alertBox.style.color = '#383d41';
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
</script>