// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale) {
    var radians = rotation * Math.PI / 180;
    var cosRot = Math.cos(radians);
    var sinRot = Math.sin(radians);

    return [
        scale * cosRot, scale * sinRot, 0,  // scaling + rotation
        -scale * sinRot, scale * cosRot, 0, // scaling + rotation
        positionX, positionY, 1        // translation
    ];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform(trans1, trans2) {
    var result = [];
    
	const MATRIX_N = 3;
    for (var i = 0; i < MATRIX_N; i++) {
        for (var j = 0; j < MATRIX_N; j++) {
            result[i * MATRIX_N + j] = 0;
            for (var k = 0; k < MATRIX_N; k++) {
                result[i * MATRIX_N + j] += trans1[i * MATRIX_N + k] * trans2[k * MATRIX_N + j];
            }
        }
    }

    return result;
}
