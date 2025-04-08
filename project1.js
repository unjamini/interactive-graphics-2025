// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.

const MAX_VAL = 255;

function composite(bgImg, fgImg, fgOpac, fgPos) {
    for (let y = 0; y < fgImg.height, y < bgImg.height; y++) {
        // background Y position
        const bgY = y + fgPos.y;

        // not changing anything if outside of background image
        if (bgY < 0) continue;

        for (let x = 0; x < fgImg.width, x < bgImg.width; x++) {
            // background X position
            const bgX = x + fgPos.x;

            // not changing anything if outside of background image
            if (bgX < 0) continue;

            const fgPixelIndex = (y * fgImg.width + x) * 4;
            const bgPixelIndex = (bgY * bgImg.width + bgX) * 4;

            const fgAlpha = fgOpac * fgImg.data[fgPixelIndex + 3] / MAX_VAL;
            const bgAlpha = bgImg.data[bgPixelIndex + 3] / MAX_VAL;
            const outAlpha = fgAlpha + bgAlpha * (1 - fgAlpha);

            for (let color = 0; color < 3; color++) {
                const fgVal = fgImg.data[fgPixelIndex + color];
                const bgVal = bgImg.data[bgPixelIndex + color];

                const outVal = Math.round(
                    (fgVal * fgAlpha + bgVal * bgAlpha * (1 - fgAlpha)) / (outAlpha || 1)
                );

                bgImg.data[bgPixelIndex + color] = outVal;
            }

            bgImg.data[bgPixelIndex + 3] = Math.round(outAlpha * MAX_VAL);
        }
    }
}
