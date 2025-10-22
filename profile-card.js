// Profile Card 3D Effect - Vanilla JS Implementation
class ProfileCard {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      avatarUrl: 'images/avatar.png',
      name: 'Loris Rameau',
      title: 'Développeur Fullstack',
      handle: 'artex6666',
      status: 'En ligne',
      contactText: 'Contact',
      pdp: 'images/pdp.png',
      ...options
    };
    
    this.init();
  }

  init() {
    this.createCard();
    this.setupEventListeners();
    this.setupInitialAnimation();
  }

  createCard() {
    this.container.innerHTML = `
      <div class="pc-card-wrapper">
        <section class="pc-card">
          <div class="pc-inside">
            <div class="pc-shine"></div>
            <div class="pc-glare"></div>
            <div class="pc-content pc-avatar-content">
              <img class="avatar" src="${this.options.avatarUrl}" alt="${this.options.name} avatar" loading="lazy" />
              <div class="pc-user-info">
                <div class="pc-user-details">
                  <div class="pc-mini-avatar">
                    <img src="${this.options.pdp}" alt="${this.options.name} mini avatar" loading="lazy" />
                  </div>
                  <div class="pc-user-text">
                    <div class="pc-handle">@${this.options.handle}</div>
                    <div class="pc-status">${this.options.status}</div>
                  </div>
                </div>
                <a href="#contact" class="pc-contact-btn" aria-label="Contact ${this.options.name}">
                  ${this.options.contactText}
                </a>
              </div>
            </div>
            <div class="pc-content">
              <div class="pc-details">
                <h3>${this.options.name}</h3>
                <p>${this.options.title}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    this.wrap = this.container.querySelector('.pc-card-wrapper');
    this.card = this.container.querySelector('.pc-card');
  }

  setupEventListeners() {
    if (!this.card || !this.wrap) return;

    this.handlePointerMove = (event) => {
      const rect = this.card.getBoundingClientRect();
      this.updateCardTransform(event.clientX - rect.left, event.clientY - rect.top);
    };

    this.handlePointerEnter = () => {
      this.cancelAnimation();
      this.wrap.classList.add('active');
      this.card.classList.add('active');
    };

    this.handlePointerLeave = (event) => {
      this.createSmoothAnimation(600, event.offsetX, event.offsetY);
      this.wrap.classList.remove('active');
      this.card.classList.remove('active');
    };

    this.card.addEventListener('pointerenter', this.handlePointerEnter);
    this.card.addEventListener('pointermove', this.handlePointerMove);
    this.card.addEventListener('pointerleave', this.handlePointerLeave);
  }

  updateCardTransform(offsetX, offsetY) {
    const width = this.card.clientWidth;
    const height = this.card.clientHeight;

    const percentX = this.clamp((100 / width) * offsetX);
    const percentY = this.clamp((100 / height) * offsetY);

    const centerX = percentX - 50;
    const centerY = percentY - 50;

    const properties = {
      '--pointer-x': `${percentX}%`,
      '--pointer-y': `${percentY}%`,
      '--background-x': `${this.adjust(percentX, 0, 100, 35, 65)}%`,
      '--background-y': `${this.adjust(percentY, 0, 100, 35, 65)}%`,
      '--pointer-from-center': `${this.clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
      '--pointer-from-top': `${percentY / 100}`,
      '--pointer-from-left': `${percentX / 100}`,
      '--rotate-x': `${this.round(-(centerX / 5))}deg`,
      '--rotate-y': `${this.round(centerY / 4)}deg`
    };

    Object.entries(properties).forEach(([property, value]) => {
      this.wrap.style.setProperty(property, value);
    });
  }

  createSmoothAnimation(duration, startX, startY) {
    const startTime = performance.now();
    const targetX = this.wrap.clientWidth / 2;
    const targetY = this.wrap.clientHeight / 2;

    const animationLoop = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = this.clamp(elapsed / duration);
      const easedProgress = this.easeInOutCubic(progress);

      const currentX = this.adjust(easedProgress, 0, 1, startX, targetX);
      const currentY = this.adjust(easedProgress, 0, 1, startY, targetY);

      this.updateCardTransform(currentX, currentY);

      if (progress < 1) {
        this.rafId = requestAnimationFrame(animationLoop);
      }
    };

    this.rafId = requestAnimationFrame(animationLoop);
  }

  setupInitialAnimation() {
    const initialX = this.wrap.clientWidth - 70;
    const initialY = 60;

    this.updateCardTransform(initialX, initialY);
    this.createSmoothAnimation(1500, initialX, initialY);
  }

  cancelAnimation() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // Utility functions
  clamp(value, min = 0, max = 100) {
    return Math.min(Math.max(value, min), max);
  }

  round(value, precision = 3) {
    return parseFloat(value.toFixed(precision));
  }

  adjust(value, fromMin, fromMax, toMin, toMax) {
    return this.round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));
  }

  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  destroy() {
    if (this.card) {
      this.card.removeEventListener('pointerenter', this.handlePointerEnter);
      this.card.removeEventListener('pointermove', this.handlePointerMove);
      this.card.removeEventListener('pointerleave', this.handlePointerLeave);
    }
    this.cancelAnimation();
  }
}

// Initialize profile card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const profileCardRoot = document.getElementById('profile-card-root');
  if (profileCardRoot) {
    new ProfileCard(profileCardRoot, {
      avatarUrl: 'images/avatar.png',
      name: 'Loris Rameau',
      title: 'Développeur Fullstack',
      handle: 'artex6666',
      status: 'En ligne',
      contactText: 'Contact',
      pdp: 'images/pdp.png',
    });
  }
});
