
// Morphology.js
// Handles shape definitions and parameters for procedural generation

export class Morphology {
    constructor() {
        this.shapeType = 'circle'; // 'circle', 'rod', 'spiral', 'blob'
        this.radius = 20;
        this.aspectRatio = 1.0; // 1.0 = circle, >1 = rod
        this.stiffness = 0.8; // 0 = jelly, 1 = solid
        this.wobbleSpeed = 0.05;
        this.wobbleAmount = 2.0;
        this.roughness = 0; // 0 = smooth, >0 = bumpy surface

        // Dynamic state
        this.phase = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.phase += this.wobbleSpeed * dt;
    }

    /**
     * Helper to get radius at a specific angle (for drawing blobs)
     * @param {number} angle
     */
    getRadiusAt(angle) {
        if (this.shapeType === 'circle' && this.wobbleAmount === 0) return this.radius;

        // Base Radius
        let r = this.radius;

        // Shape modifiers
        if (this.shapeType === 'rod') {
             // Simplified rod approximation for radial lookup (ellipse-ish)
             // Real rod drawing handles this via drawing rect+caps
             const rx = this.radius * this.aspectRatio;
             const ry = this.radius;
             // Ellipse formula
             const div = Math.sqrt(
                 Math.pow(Math.cos(angle) / rx, 2) +
                 Math.pow(Math.sin(angle) / ry, 2)
             );
             r = 1 / div;
        }

        // Organic Wobble
        if (this.wobbleAmount > 0) {
            r += Math.sin(angle * 3 + this.phase) * this.wobbleAmount;
            r += Math.sin(angle * 5 - this.phase * 0.5) * (this.wobbleAmount * 0.5);
        }

        return r;
    }
}
