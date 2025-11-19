// script.js
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. スクロールアニメーション (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // 15%見えたら発火
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // 一度だけ再生
            }
        });
    }, observerOptions);

    // 監視対象の要素を取得
    const animatedElements = document.querySelectorAll('.section-title, .image-wrapper, .text-content');
    animatedElements.forEach(el => observer.observe(el));


    // 2. シンプルなパララックス効果 (Hero Image)
    const parallaxBg = document.querySelector('.parallax-bg');
    if (parallaxBg) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            // スクロール量の半分だけ背景を移動させる
            parallaxBg.style.transform = `translateY(${scrollY * 0.5}px)`;
        });
    }
});