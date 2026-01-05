
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

        // Division params
        this.constriction = 0; // 0..1 (0 = none, 1 = separated)
        this.divisionAxis = 0; // Angle of division

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
        // Handle Aspect Ratio (Elongation with constant area)
        // Treat as ellipse aligned with divisionAxis
        let da = angle - this.divisionAxis;

        let a = this.radius;
        let b = this.radius;

        if (this.aspectRatio > 1.0) {
            // Constant Area: a*b = r*r. a/b = AR.
            // a = r * sqrt(AR), b = r / sqrt(AR)
            const sqrtAR = Math.sqrt(this.aspectRatio);
            a = this.radius * sqrtAR;
            b = this.radius / sqrtAR;
        }

        // Ellipse Radius Formula: r = ab / sqrt( (b cos theta)^2 + (a sin theta)^2 )
        const denom = Math.sqrt(Math.pow(b * Math.cos(da), 2) + Math.pow(a * Math.sin(da), 2));
        let r = (a * b) / denom;

        // Shape modifiers (Legacy Rod override if needed, but above covers elongation)
        if (this.shapeType === 'rod') {
             // For strict 'rod' type we might use the rect approximation, but here we update the radial lookup
             // to match the ellipse logic which is smoother for deformations.
        }

        // Division Constriction (Peanut Shape)
        if (this.constriction > 0) {
            // Normalize da to -PI..PI
            while (da < -Math.PI) da += Math.PI * 2;
            while (da > Math.PI) da -= Math.PI * 2;

            // Indentation at 90 deg from axis
            const pinch = Math.pow(Math.sin(da), 2);
            r *= (1 - this.constriction * 0.9 * pinch);
        }

        // Organic Wobble
        if (this.wobbleAmount > 0) {
            r += Math.sin(angle * 3 + this.phase) * this.wobbleAmount;
            r += Math.sin(angle * 5 - this.phase * 0.5) * (this.wobbleAmount * 0.5);
        }

        return r;
    }
}
