const Orbit = {
    menu: null,
    satellitesContainer: null,
    selectedNodeId: null,

    init() {
        this.menu = document.getElementById('orbit');
        this.satellitesContainer = document.getElementById('orbit-satellites');
    },

    show(nodeId, domPos, palette, onColorSelect, scale = 1) {
        if (!this.menu) this.init();
        this.selectedNodeId = nodeId;

        this.menu.classList.remove('hidden');

        // Position the container exactly on the node center
        this.menu.style.left = domPos.x + 'px';
        this.menu.style.top = domPos.y + 'px';
        
        // Scale the menu based on zoom level
        this.menu.style.transform = `scale(${scale})`;

        // Render Satellites
        this.satellitesContainer.innerHTML = ''; // Clear old

        // Calculate angles
        // Arc Geometry: Span from startSpan(right) to endSpan(left)
        const startSpan = 240; 
        const endSpan = -10;
        palette.forEach((color, index) => {
            const btn = document.createElement('div');
            btn.className = 'satellite';
            btn.style.backgroundColor = color;
            
            // Calculate Angle
            const step = (endSpan - startSpan) / (palette.length - 1);
            const angle = endSpan + (index * step);
            
            btn.style.setProperty('--angle', `${angle}deg`);
            
            btn.onclick = (e) => {
                e.stopPropagation();
                onColorSelect(nodeId, color);
            };
            
            this.satellitesContainer.appendChild(btn);

            // Staggered Animation
            setTimeout(() => {
                btn.classList.add('visible');
            }, index * 30);
        });
    },

    hide() {
        if (this.menu) this.menu.classList.add('hidden');
        this.selectedNodeId = null;
    }
};

window.Orbit = Orbit;