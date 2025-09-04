// Глобальные переменные
let products = [];
let users = [];
let currentUser = null;
let currentFilter = 'all';
let currentEditingProduct = null;
let isOnline = navigator.onLine;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Очищаем старые флаги товаров по умолчанию
    localStorage.removeItem('defaultProductsAdded');
    
    setupNavigation();
    setupProductForm();
    setupContactForm();
    setupModal();
    setupFilters();
    setupAuth();
    setupAdminPanel();
    setupTheme();
    setupScrollAnimations();
    
    // Загружаем данные с сервера или из localStorage
    await loadDataFromServer();
    
    // Инициализируем остальные компоненты
    loadProducts();
    addSampleUsers();
    updateNavigation();
    updateContactDisplay();
    
    // Отладочная информация
    console.log('Приложение инициализировано');
    console.log('Текущий пользователь:', currentUser);
    console.log('Все пользователи:', users);
    console.log('Товары при инициализации:', products);
}

// Функции для работы с API
async function loadDataFromServer() {
    try {
        if (isOnline && window.api) {
            console.log('Загружаем данные с сервера...');
            const serverData = await window.api.getAllData();
            
            products = serverData.products || [];
            users = serverData.users || [];
            
            // Загружаем текущего пользователя из localStorage
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
            }
            
            console.log('Данные загружены с сервера');
        } else {
            console.log('Сервер недоступен, загружаем из localStorage...');
            await loadDataFromLocalStorage();
        }
    } catch (error) {
        console.error('Ошибка загрузки с сервера:', error);
        await loadDataFromLocalStorage();
    }
}

async function loadDataFromLocalStorage() {
    const storedProducts = localStorage.getItem('products');
    const storedUsers = localStorage.getItem('users');
    const storedUser = localStorage.getItem('currentUser');
    
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    }
    if (storedUsers) {
        users = JSON.parse(storedUsers);
    }
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
}

async function syncDataToServer() {
    try {
        if (isOnline && window.api) {
            await window.api.syncAllData({
                products: products,
                users: users,
                contacts: JSON.parse(localStorage.getItem('contacts')) || [],
                settings: JSON.parse(localStorage.getItem('siteSettings')) || {}
            });
            console.log('Данные синхронизированы с сервером');
        }
    } catch (error) {
        console.error('Ошибка синхронизации с сервером:', error);
    }
}

// Навигация
function setupNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Мобильное меню
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Плавная прокрутка к секциям
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                // Специальная обработка для кнопки "Войти"
                if (targetId === '#login') {
                    document.getElementById('login').style.display = 'block';
                } else {
                    // Скрываем форму входа при переходе на другие страницы
                    document.getElementById('login').style.display = 'none';
                }
                
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Закрыть мобильное меню
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    });

    // Изменение навигации при прокрутке
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(44, 62, 80, 0.98)';
        } else {
            navbar.style.background = 'rgba(44, 62, 80, 0.95)';
        }
    });
}

// Форма добавления товара
function setupProductForm() {
    const form = document.getElementById('productForm');
    const imageInput = document.getElementById('productImages');
    const imagePreview = document.getElementById('imagePreview');

    // Предварительный просмотр изображений
    imageInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        imagePreview.innerHTML = '';
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    imagePreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Отправка формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Проверяем, что пользователь авторизован как админ
        if (!currentUser || currentUser.role !== 'admin') {
            showNotification('Только администраторы могут добавлять товары', 'error');
            return;
        }
        
        const formData = new FormData(form);
        const product = {
            id: Date.now(),
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseInt(formData.get('price')),
            description: formData.get('description'),
            images: [],
            dateAdded: new Date().toISOString()
        };

        // Проверяем обязательные поля
        if (!product.name || !product.category || !product.price || !product.description) {
            showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        // Обработка изображений с сжатием
        const files = Array.from(imageInput.files);
        let processedImages = 0;
        
        if (files.length > 0) {
            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    // Сжимаем изображение перед сохранением
                    compressImage(file, 800, 600, 0.7).then(compressedImage => {
                        product.images.push(compressedImage);
                        processedImages++;
                        
                        console.log(`Изображение ${processedImages} из ${files.length} сжато и добавлено`);
                        
                        // Если обработали все изображения, сохраняем товар
                        if (processedImages === files.length) {
                            saveProduct(product);
                        }
                    });
                } else {
                    processedImages++;
                    if (processedImages === files.length) {
                        saveProduct(product);
                    }
                }
            });
        } else {
            // Если нет изображений, сохраняем товар сразу
            saveProduct(product);
        }
    });
}

async function saveProduct(product) {
    console.log('saveProduct вызвана с товаром:', product);
    console.log('Текущий массив products до добавления:', products);
    
    // Проверяем размер localStorage перед сохранением
    cleanupOldData();
    
    // Добавляем анимацию загрузки
    showProductAddingAnimation();
    
    // Небольшая задержка для демонстрации анимации
    setTimeout(async () => {
        try {
            // Добавляем товар в массив
            products.push(product);
            
            console.log('Товар добавлен в массив. Новый массив:', products);
            
            // Сохраняем в localStorage
            const productsJson = JSON.stringify(products);
            localStorage.setItem('products', productsJson);
            
            // Синхронизируем с сервером
            await syncDataToServer();
            
            console.log('Товар сохранен в localStorage и синхронизирован с сервером');
            console.log('Размер localStorage:', checkLocalStorageSize(), 'символов');
            
            // Очистка формы
            document.getElementById('productForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
            
            // Обновление отображения в основном каталоге
            console.log('Вызываем loadProducts()');
            loadProducts();
            
            // Обновление отображения в админ-панели
            if (currentUser && currentUser.role === 'admin') {
                console.log('Вызываем loadAdminProducts()');
                loadAdminProducts();
            }
            
            // Показ уведомления об успехе
            showProductSuccessNotification(product.name);
            
            // Прокрутка к каталогу
            document.getElementById('products').scrollIntoView({
                behavior: 'smooth'
            });
        } catch (error) {
            console.error('Ошибка сохранения товара:', error);
            showNotification('Ошибка сохранения товара', 'error');
        }
    }, 1500);
}

// Форма контактов
function setupContactForm() {
    const form = document.getElementById('contactForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const contactData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            message: formData.get('message'),
            date: new Date().toISOString()
        };
        
        // Проверяем, что все поля заполнены
        if (!contactData.name || !contactData.phone || !contactData.message) {
            showNotification('Пожалуйста, заполните все поля', 'error');
            return;
        }
        
        // Сохранение заявки в localStorage
        let contacts = JSON.parse(localStorage.getItem('contacts')) || [];
        contacts.push(contactData);
        localStorage.setItem('contacts', JSON.stringify(contacts));
        
        console.log('Контактная заявка сохранена:', contactData);
        console.log('Все заявки:', contacts);
        
        // Очистка формы
        form.reset();
        
        // Показ уведомления
        showNotification('Заявка отправлена! Мы свяжемся с вами в ближайшее время.', 'success');
    });
}

// Модальное окно
function setupModal() {
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close');
    const orderBtn = document.getElementById('orderBtn');
    
    // Закрытие модального окна
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Кнопка заказа
    orderBtn.addEventListener('click', function() {
        const productName = document.getElementById('modalTitle').textContent;
        showNotification(`Заказ на "${productName}" отправлен!`, 'success');
        closeModal();
    });
}

function openModal(product) {
    const modal = document.getElementById('productModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const modalDescription = document.getElementById('modalDescription');
    const modalThumbnails = document.getElementById('modalThumbnails');
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    // Заполнение данных
    modalTitle.textContent = product.name;
    modalPrice.textContent = `${product.price.toLocaleString()} руб.`;
    modalDescription.textContent = product.description;
    
    // Показываем кнопки редактирования и удаления только для админов
    if (currentUser && currentUser.role === 'admin') {
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        editBtn.onclick = () => {
            closeModal();
            editProduct(product.id);
        };
        deleteBtn.onclick = () => {
            closeModal();
            deleteProduct(product.id);
        };
    } else {
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    }
    
    // Обработка изображений
    if (product.images && product.images.length > 0) {
        modalImage.src = product.images[0];
        modalThumbnails.innerHTML = '';
        
        product.images.forEach((image, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = image;
            thumbnail.className = 'thumbnail';
            if (index === 0) thumbnail.classList.add('active');
            
            thumbnail.addEventListener('click', function() {
                modalImage.src = image;
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
            
            modalThumbnails.appendChild(thumbnail);
        });
    } else {
        // Скрываем изображение если его нет
        modalImage.style.display = 'none';
        modalThumbnails.innerHTML = '';
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Фильтры товаров
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Удаляем активный класс со всех кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем активный класс к текущей кнопке
            this.classList.add('active');
            
            // Устанавливаем текущий фильтр
            currentFilter = this.getAttribute('data-filter');
            
            // Фильтруем товары
            filterProducts();
        });
    });
}

function filterProducts() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const category = card.getAttribute('data-category');
        
        if (currentFilter === 'all' || category === currentFilter) {
            card.style.display = 'block';
            card.classList.add('fade-in');
        } else {
            card.style.display = 'none';
        }
    });
}

// Загрузка и отображение товаров
function loadProducts() {
    console.log('loadProducts вызвана');
    
    // Обновляем массив products из localStorage
    const storedProducts = localStorage.getItem('products');
    console.log('storedProducts из localStorage:', storedProducts);
    
    if (storedProducts) {
        products = JSON.parse(storedProducts);
        console.log('products обновлен из localStorage:', products);
    }
    
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.error('productsGrid не найден!');
        return;
    }
    
    productsGrid.innerHTML = '';
    
    console.log('loadProducts: товаров в массиве:', products.length);
    console.log('loadProducts: товары:', products);
    
    if (products.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #bdc3c7; padding: 50px;">
                <i class="fas fa-hammer" style="font-size: 3rem; margin-bottom: 20px; color: #e74c3c;"></i>
                <h3>Пока нет товаров</h3>
                <p>Добавьте первый товар, используя форму выше</p>
            </div>
        `;
        return;
    }
    
    products.forEach((product, index) => {
        console.log(`Создаем карточку для товара ${index}:`, product);
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
    
    // Применяем текущий фильтр
    filterProducts();
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-category', product.category);
    
    const categoryNames = {
        'doors': 'Двери',
        'fences': 'Заборы',
        'forged': 'Ковка'
    };
    
    // Создаем изображение только если оно есть
    let imageHtml = '';
    if (product.images && product.images.length > 0) {
        imageHtml = `<img src="${product.images[0]}" alt="${product.name}" class="product-image">`;
    } else {
        // Создаем пустой блок для изображения без текста
        imageHtml = `<div class="product-image-placeholder"></div>`;
    }
    
    card.innerHTML = `
        <div class="product-category">${categoryNames[product.category] || product.category}</div>
        ${imageHtml}
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">${product.price.toLocaleString()} руб.</div>
            <p class="product-description">${product.description}</p>
            <button class="btn btn-primary" onclick="openModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                Подробнее
            </button>
        </div>
    `;
    
    return card;
}



// Анимации при прокрутке
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Наблюдаем за секциями
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // Наблюдаем за карточками товаров
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        observer.observe(card);
    });
}

// Анимация добавления товара
function showProductAddingAnimation() {
    // Создаем оверлей для анимации
    const overlay = document.createElement('div');
    overlay.id = 'productAddingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 5000;
        backdrop-filter: blur(5px);
    `;
    
    // Создаем контейнер для анимации
    const animationContainer = document.createElement('div');
    animationContainer.style.cssText = `
        text-align: center;
        color: white;
    `;
    
    // Создаем анимированную иконку
    const icon = document.createElement('div');
    icon.innerHTML = '<i class="fas fa-hammer" style="font-size: 4rem; color: #e74c3c; animation: hammerWork 1s infinite;"></i>';
    
    // Создаем текст
    const text = document.createElement('div');
    text.innerHTML = '<h3 style="margin-top: 20px; font-size: 1.5rem;">Добавляем товар...</h3>';
    
    // Создаем прогресс-бар
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        width: 300px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        margin-top: 20px;
        overflow: hidden;
    `;
    
    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #e74c3c, #c0392b);
        border-radius: 2px;
        animation: progressFill 1.5s ease-out forwards;
    `;
    
    progressBar.appendChild(progressFill);
    
    animationContainer.appendChild(icon);
    animationContainer.appendChild(text);
    animationContainer.appendChild(progressBar);
    overlay.appendChild(animationContainer);
    
    document.body.appendChild(overlay);
    
    // Добавляем CSS анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes hammerWork {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-15deg) scale(1.1); }
            50% { transform: rotate(0deg) scale(1.2); }
            75% { transform: rotate(15deg) scale(1.1); }
        }
        
        @keyframes progressFill {
            0% { width: 0%; }
            100% { width: 100%; }
        }
    `;
    document.head.appendChild(style);
    
    // Удаляем оверлей через 1.5 секунды
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
                style.remove();
            }, 300);
        }
    }, 1500);
}

// Анимация сохранения изменений
function showSavingAnimation() {
    // Создаем оверлей для анимации
    const overlay = document.createElement('div');
    overlay.id = 'savingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 6000;
        backdrop-filter: blur(5px);
    `;
    
    // Создаем контейнер для анимации
    const animationContainer = document.createElement('div');
    animationContainer.style.cssText = `
        text-align: center;
        color: white;
    `;
    
    // Создаем анимированную иконку
    const icon = document.createElement('div');
    icon.innerHTML = '<i class="fas fa-save" style="font-size: 4rem; color: #27ae60; animation: savePulse 1s infinite;"></i>';
    
    // Создаем текст
    const text = document.createElement('div');
    text.innerHTML = '<h3 style="margin-top: 20px; font-size: 1.5rem;">Сохраняем изменения...</h3>';
    
    // Создаем прогресс-бар
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        width: 300px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        margin-top: 20px;
        overflow: hidden;
    `;
    
    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #27ae60, #2ecc71);
        border-radius: 2px;
        animation: progressFill 1.5s ease-out forwards;
    `;
    
    progressBar.appendChild(progressFill);
    
    animationContainer.appendChild(icon);
    animationContainer.appendChild(text);
    animationContainer.appendChild(progressBar);
    overlay.appendChild(animationContainer);
    
    document.body.appendChild(overlay);
    
    // Добавляем CSS анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes savePulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes progressFill {
            0% { width: 0%; }
            100% { width: 100%; }
        }
    `;
    document.head.appendChild(style);
    
    // Удаляем оверлей через 1.5 секунды
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
                style.remove();
            }, 300);
        }
    }, 1500);
}

// Уведомление об успешном добавлении товара
function showProductSuccessNotification(productName) {
    // Создаем специальное уведомление
    const notification = document.createElement('div');
    notification.className = 'product-success-notification';
    notification.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="success-text">
                <h3>Товар успешно добавлен!</h3>
                <p>"${productName}" теперь доступен в каталоге</p>
            </div>
            <button class="success-close">&times;</button>
        </div>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(39, 174, 96, 0.4);
        z-index: 4000;
        animation: slideInSuccess 0.5s ease-out;
        max-width: 400px;
        border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    notification.querySelector('.success-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 15px;
    `;
    
    notification.querySelector('.success-icon').style.cssText = `
        font-size: 2.5rem;
        animation: bounceIn 0.6s ease-out;
    `;
    
    notification.querySelector('.success-text h3').style.cssText = `
        margin: 0 0 5px 0;
        font-size: 1.2rem;
        font-weight: 600;
    `;
    
    notification.querySelector('.success-text p').style.cssText = `
        margin: 0;
        opacity: 0.9;
        font-size: 0.9rem;
    `;
    
    notification.querySelector('.success-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        margin-left: auto;
        padding: 5px;
        border-radius: 50%;
        transition: background 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Добавляем CSS анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInSuccess {
            from {
                opacity: 0;
                transform: translateX(100%) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }
        
        @keyframes bounceIn {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        .success-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(style);
    
    // Закрытие уведомления
    notification.querySelector('.success-close').addEventListener('click', function() {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 300);
    });
    
    // Автоматическое закрытие через 6 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }
    }, 6000);
}

// Уведомления
function showNotification(message, type = 'info') {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
    `;
    
    document.body.appendChild(notification);
    
    // Закрытие уведомления
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Автоматическое закрытие через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Дополнительные CSS анимации для уведомлений
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(notificationStyles);

// Утилиты
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU');
}

// Функция сжатия изображения
function compressImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Вычисляем новые размеры
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            // Устанавливаем размеры canvas
            canvas.width = width;
            canvas.height = height;
            
            // Рисуем сжатое изображение
            ctx.drawImage(img, 0, 0, width, height);
            
            // Конвертируем в base64 с заданным качеством
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Функция проверки размера localStorage
function checkLocalStorageSize() {
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length;
        }
    }
    return totalSize; // размер в символах
}

// Функция очистки старых данных при переполнении
function cleanupOldData() {
    const maxSize = 4 * 1024 * 1024; // 4MB в символах (примерно)
    const currentSize = checkLocalStorageSize();
    
    if (currentSize > maxSize) {
        console.log('localStorage переполнен, очищаем старые данные...');
        
        // Удаляем старые контакты (оставляем только последние 50)
        const contacts = JSON.parse(localStorage.getItem('contacts')) || [];
        if (contacts.length > 50) {
            const recentContacts = contacts.slice(-50);
            localStorage.setItem('contacts', JSON.stringify(recentContacts));
            console.log('Удалены старые контакты');
        }
        
        // Удаляем старые товары без изображений (оставляем только последние 100)
        const products = JSON.parse(localStorage.getItem('products')) || [];
        if (products.length > 100) {
            const recentProducts = products.slice(-100);
            localStorage.setItem('products', JSON.stringify(recentProducts));
            console.log('Удалены старые товары');
        }
    }
}

// Система авторизации
function setupAuth() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    // Переключение между вкладками
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Убираем активный класс со всех кнопок и форм
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            
            // Добавляем активный класс к выбранной кнопке и форме
            this.classList.add('active');
            document.getElementById(tabName + 'Form').classList.add('active');
        });
    });
    
    // Обработка формы входа
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        console.log('Попытка входа:', { email, password });
        console.log('Доступные пользователи:', users);
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateNavigation();
            showNotification('Добро пожаловать, ' + user.name + '!', 'success');
            
            // Переход на главную страницу
            document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
        } else {
            showNotification('Неверный email или пароль', 'error');
            console.log('Пользователь не найден');
        }
    });
    
    // Обработка формы регистрации
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        // Проверяем, не существует ли уже пользователь с таким email
        if (users.find(u => u.email === email)) {
            showNotification('Пользователь с таким email уже существует', 'error');
            return;
        }
        
        // Проверяем валидность email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('Пожалуйста, введите корректный email адрес', 'error');
            return;
        }
        
        // Проверяем длину пароля
        if (password.length < 6) {
            showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        const newUser = {
            id: Date.now(),
            name: name,
            email: email,
            password: password,
            phone: 'Не указан',
            role: 'user', // Все новые пользователи только обычные пользователи
            dateRegistered: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Синхронизируем с сервером
        await syncDataToServer();
        
        // Автоматический вход после регистрации
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateNavigation();
        
        showNotification('Регистрация успешна! Добро пожаловать, ' + name + '!', 'success');
        
        // Переход на главную страницу
        document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
    });
}

function updateNavigation() {
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');
    const profileLink = document.getElementById('profileLink');
    const addProductLink = document.getElementById('addProductLink');
    const adminPanelLink = document.getElementById('adminPanelLink');
    
    // Скрываем все секции по умолчанию
    document.getElementById('profile').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('add-product').style.display = 'none';
    document.getElementById('login').style.display = 'none';
    
    if (currentUser) {
        loginLink.style.display = 'none';
        logoutLink.style.display = 'block';
        profileLink.style.display = 'block';
        
        // Показываем профиль для всех авторизованных пользователей
        document.getElementById('profile').style.display = 'block';
        
        // Загружаем данные профиля
        loadProfile();
        
        if (currentUser.role === 'admin') {
            addProductLink.style.display = 'block';
            adminPanelLink.style.display = 'block';
            document.getElementById('add-product').style.display = 'block';
            document.getElementById('admin-panel').style.display = 'block';
        } else {
            addProductLink.style.display = 'none';
            adminPanelLink.style.display = 'none';
        }
    } else {
        loginLink.style.display = 'block';
        logoutLink.style.display = 'none';
        profileLink.style.display = 'none';
        addProductLink.style.display = 'none';
        adminPanelLink.style.display = 'none';
        document.getElementById('login').style.display = 'block';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateNavigation();
    showNotification('Вы вышли из системы', 'info');
    
    // Переход на главную страницу
    document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
}

function addSampleUsers() {
    // Всегда обновляем тестовых пользователей для отладки
    const sampleUsers = [
        {
            id: 1,
            name: 'Отец (Администратор)',
            email: 'father@metall.ru',
            password: 'father123',
            phone: '+7 (999) 123-45-67',
            role: 'admin',
            dateRegistered: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Иван Петров',
            email: 'user@example.com',
            password: 'user123',
            phone: '+7 (999) 765-43-21',
            role: 'user',
            dateRegistered: new Date().toISOString()
        }
    ];
    
    // Проверяем, есть ли уже пользователи с такими email
    const existingEmails = users.map(u => u.email);
    const newUsers = sampleUsers.filter(user => !existingEmails.includes(user.email));
    
    if (newUsers.length > 0) {
        users = [...users, ...newUsers];
        localStorage.setItem('users', JSON.stringify(users));
        console.log('Добавлены тестовые пользователи:', newUsers);
    }
}

// Управление профилем
function loadProfile() {
    if (!currentUser) {
        // Если пользователь не авторизован, показываем заглушку
        document.getElementById('profileName').textContent = 'Не авторизован';
        document.getElementById('profileEmail').textContent = 'Войдите в систему';
        document.getElementById('profilePhone').textContent = '—';
        document.getElementById('profileRole').textContent = 'Гость';
        return;
    }
    
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profilePhone').textContent = currentUser.phone || 'Не указан';
    document.getElementById('profileRole').textContent = currentUser.role === 'admin' ? 'Администратор' : 'Пользователь';
    
    // Добавляем дополнительную информацию
    const profileDetails = document.querySelector('.profile-details');
    if (profileDetails && !profileDetails.querySelector('.profile-stats')) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'profile-stats';
        statsDiv.innerHTML = `
            <p><strong>Дата регистрации:</strong> ${formatDate(currentUser.dateRegistered)}</p>
            <p><strong>Статус:</strong> ${currentUser.role === 'admin' ? 'Активный администратор' : 'Активный пользователь'}</p>
        `;
        profileDetails.appendChild(statsDiv);
    }
}

function editProfile() {
    if (!currentUser) return;
    
    const newName = prompt('Введите новое имя:', currentUser.name);
    if (newName && newName.trim()) {
        const newPhone = prompt('Введите новый телефон:', currentUser.phone);
        
        currentUser.name = newName.trim();
        if (newPhone) currentUser.phone = newPhone.trim();
        
        // Обновляем в массиве пользователей
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        loadProfile();
        showNotification('Профиль обновлен', 'success');
    }
}

function showMyOrders() {
    showNotification('Функция "Мои заказы" будет добавлена в следующей версии', 'info');
}

// Админ-панель
function setupAdminPanel() {
    const adminTabButtons = document.querySelectorAll('.admin-tab-btn');
    
    adminTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Убираем активный класс со всех кнопок и контента
            adminTabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.admin-content').forEach(content => content.classList.remove('active'));
            
            // Добавляем активный класс к выбранной кнопке и контенту
            this.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Загружаем соответствующий контент
            switch(tabName) {
                case 'products':
                    loadAdminProducts();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        });
    });
    
    // Настройки сайта
    const settingsForm = document.getElementById('settingsForm');
    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Собираем данные из формы
        const settings = {
            siteName: document.getElementById('siteName').value,
            siteDescription: document.getElementById('siteDescription').value,
            contactPhone: document.getElementById('contactPhone').value,
            contactEmail: document.getElementById('contactEmail').value,
            contactAddress: document.getElementById('contactAddress').value
        };
        
        // Сохраняем в localStorage
        localStorage.setItem('siteSettings', JSON.stringify(settings));
        
        // Обновляем отображение контактной информации на сайте
        updateContactDisplay();
        
        showNotification('Настройки сохранены', 'success');
    });
}

function loadAdminProducts() {
    // Обновляем массив products из localStorage
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    }
    
    const adminProductsGrid = document.getElementById('adminProductsGrid');
    adminProductsGrid.innerHTML = '';
    
    console.log('loadAdminProducts вызвана, товаров:', products.length);
    
    if (products.length === 0) {
        adminProductsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #bdc3c7; padding: 50px;">
                <i class="fas fa-hammer" style="font-size: 3rem; margin-bottom: 20px; color: #e74c3c;"></i>
                <h3>Нет товаров</h3>
                <p>Добавьте первый товар</p>
            </div>
        `;
        return;
    }
    
    products.forEach(product => {
        const productCard = createAdminProductCard(product);
        adminProductsGrid.appendChild(productCard);
    });
}

function createAdminProductCard(product) {
    const card = document.createElement('div');
    card.className = 'admin-product-card';
    
    const categoryNames = {
        'doors': 'Двери',
        'fences': 'Заборы',
        'forged': 'Ковка'
    };
    
    // Создаем изображение только если оно есть
    let imageHtml = '';
    if (product.images && product.images.length > 0) {
        imageHtml = `<img src="${product.images[0]}" alt="${product.name}" class="product-image">`;
    } else {
        // Создаем пустой блок для изображения без текста
        imageHtml = `<div class="product-image-placeholder"></div>`;
    }
    
    card.innerHTML = `
        <div class="admin-product-actions">
            <button class="edit-btn" onclick="editProduct(${product.id})" title="Редактировать">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteProduct(${product.id})" title="Удалить">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        ${imageHtml}
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">${product.price.toLocaleString()} руб.</div>
            <p class="product-description">${product.description}</p>
            <div class="product-category">${categoryNames[product.category] || product.category}</div>
        </div>
    `;
    
    return card;
}

function loadOrders() {
    const ordersList = document.getElementById('ordersList');
    const contacts = JSON.parse(localStorage.getItem('contacts')) || [];
    
    if (contacts.length === 0) {
        ordersList.innerHTML = `
            <div style="text-align: center; color: #bdc3c7; padding: 50px;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 20px; color: #e74c3c;"></i>
                <h3>Нет заказов</h3>
                <p>Заказы будут отображаться здесь</p>
            </div>
        `;
        return;
    }
    
    ordersList.innerHTML = '';
    contacts.forEach((contact, index) => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
            <div class="order-header">
                <span class="order-id">Заказ #${index + 1}</span>
                <span class="order-date">${formatDate(contact.date)}</span>
                <span class="order-status new">Новый</span>
            </div>
            <div class="order-details">
                <p><strong>Имя:</strong> ${contact.name}</p>
                <p><strong>Телефон:</strong> ${contact.phone}</p>
                <p><strong>Сообщение:</strong> ${contact.message}</p>
            </div>
            <div class="order-actions">
                <button class="btn btn-primary" onclick="updateOrderStatus(${index}, 'processing')">В обработку</button>
                <button class="btn btn-secondary" onclick="updateOrderStatus(${index}, 'completed')">Завершить</button>
            </div>
        `;
        ordersList.appendChild(orderItem);
    });
}

function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    // Только отец может управлять пользователями
    const canManageUsers = currentUser && currentUser.email === 'father@metall.ru';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        let actionsHtml = '';
        if (canManageUsers) {
            actionsHtml = `
                <button class="btn btn-secondary" onclick="editUser(${user.id})">Редактировать</button>
                ${user.id !== currentUser.id && user.email !== 'father@metall.ru' ? `<button class="btn btn-danger" onclick="deleteUser(${user.id})">Удалить</button>` : ''}
            `;
        } else {
            actionsHtml = '<span style="color: #bdc3c7;">Только просмотр</span>';
        }
        
        userItem.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <h4>${user.name} ${user.email === 'father@metall.ru' ? '(Главный администратор)' : ''}</h4>
                    <p>${user.email}</p>
                    <p>${user.phone}</p>
                    <span class="profile-role">${user.role === 'admin' ? 'Администратор' : 'Пользователь'}</span>
                </div>
            </div>
            <div class="user-actions">
                ${actionsHtml}
            </div>
        `;
        usersList.appendChild(userItem);
    });
}

function loadSettings() {
    // Загружаем текущие настройки
    const settings = JSON.parse(localStorage.getItem('siteSettings')) || {
        siteName: 'МеталлМастер',
        siteDescription: 'Качественные двери, заборы и кованые изделия на заказ',
        contactPhone: '+7 (XXX) XXX-XX-XX',
        contactEmail: 'master@metall.ru',
        contactAddress: 'г. Ваш город, ул. Мастерская, д. 1'
    };
    
    document.getElementById('siteName').value = settings.siteName;
    document.getElementById('siteDescription').value = settings.siteDescription;
    document.getElementById('contactPhone').value = settings.contactPhone;
    document.getElementById('contactEmail').value = settings.contactEmail;
    document.getElementById('contactAddress').value = settings.contactAddress;
}

// Функция для обновления отображения контактной информации на сайте
function updateContactDisplay() {
    const settings = JSON.parse(localStorage.getItem('siteSettings')) || {
        contactPhone: '+7 (XXX) XXX-XX-XX',
        contactEmail: 'master@metall.ru',
        contactAddress: 'г. Ваш город, ул. Мастерская, д. 1'
    };
    
    // Обновляем контактную информацию в секции контактов
    const contactPhoneElement = document.querySelector('.contact-item:nth-child(1) p');
    const contactEmailElement = document.querySelector('.contact-item:nth-child(2) p');
    const contactAddressElement = document.querySelector('.contact-item:nth-child(3) p');
    
    if (contactPhoneElement) contactPhoneElement.textContent = settings.contactPhone;
    if (contactEmailElement) contactEmailElement.textContent = settings.contactEmail;
    if (contactAddressElement) contactAddressElement.textContent = settings.contactAddress;
}

// Управление товарами
function showAddProductForm() {
    document.getElementById('add-product').scrollIntoView({ behavior: 'smooth' });
}

function cancelAddProduct() {
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    currentEditingProduct = product;
    
    // Заполняем форму редактирования
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductDescription').value = product.description;
    
    // Показываем текущие изображения
    const currentImages = document.getElementById('currentImages');
    currentImages.innerHTML = '';
    
    if (product.images && product.images.length > 0) {
        product.images.forEach((image, index) => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'current-image';
            imageDiv.innerHTML = `
                <img src="${image}" alt="Изображение ${index + 1}">
                <button class="remove-image" onclick="removeProductImage(${product.id}, ${index})">&times;</button>
            `;
            currentImages.appendChild(imageDiv);
        });
    }
    
    // Открываем модальное окно
    const modal = document.getElementById('editProductModal');
    modal.style.display = 'block';
    
    // Прокручиваем к началу страницы, чтобы модальное окно было видно
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeEditModal() {
    document.getElementById('editProductModal').style.display = 'none';
    // document.body.style.overflow = 'auto'; // Убираем эту строку, так как мы не блокировали прокрутку
    currentEditingProduct = null;
}

function deleteProduct(productId) {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
        products = products.filter(p => p.id !== productId);
        localStorage.setItem('products', JSON.stringify(products));
        loadProducts();
        loadAdminProducts();
        showNotification('Товар удален', 'success');
    }
}

function removeProductImage(productId, imageIndex) {
    const product = products.find(p => p.id === productId);
    if (product && product.images) {
        product.images.splice(imageIndex, 1);
        localStorage.setItem('products', JSON.stringify(products));
        editProduct(productId); // Обновляем форму
        showNotification('Изображение удалено', 'success');
    }
}

// Обработка формы редактирования товара
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editProductForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            console.log('Форма редактирования отправлена');
            
            const productId = parseInt(document.getElementById('editProductId').value);
            const product = products.find(p => p.id === productId);
            
            console.log('ID товара:', productId);
            console.log('Найденный товар:', product);
            
            if (product) {
                // Обновляем данные товара
                product.name = document.getElementById('editProductName').value;
                product.category = document.getElementById('editProductCategory').value;
                product.price = parseInt(document.getElementById('editProductPrice').value);
                product.description = document.getElementById('editProductDescription').value;
                
                console.log('Обновленные данные товара:', product);
                
                // Обработка новых изображений
                const newImagesInput = document.getElementById('editProductImages');
                const files = Array.from(newImagesInput.files);
                
                console.log('Обрабатываем новые изображения:', files.length);
                
                if (files.length > 0) {
                    let processedImages = 0;
                    
                    files.forEach(file => {
                        if (file.type.startsWith('image/')) {
                            // Сжимаем изображение перед сохранением
                            compressImage(file, 800, 600, 0.7).then(compressedImage => {
                                if (!product.images) product.images = [];
                                product.images.push(compressedImage);
                                processedImages++;
                                
                                console.log(`Изображение ${processedImages} из ${files.length} сжато и добавлено`);
                                
                                // Если обработали все изображения, сохраняем
                                if (processedImages === files.length) {
                                    console.log('Все изображения обработаны, сохраняем товар');
                                    saveEditedProduct();
                                }
                            });
                        } else {
                            processedImages++;
                            if (processedImages === files.length) {
                                saveEditedProduct();
                            }
                        }
                    });
                } else {
                    console.log('Нет новых изображений, сохраняем товар');
                    saveEditedProduct();
                }
            } else {
                console.error('Товар не найден!');
                showNotification('Ошибка: товар не найден', 'error');
            }
        });
    }
});

function saveEditedProduct() {
    console.log('saveEditedProduct вызвана');
    
    // Проверяем размер localStorage перед сохранением
    cleanupOldData();
    
    // Показываем анимацию сохранения
    showSavingAnimation();
    
    // Небольшая задержка для демонстрации анимации
    setTimeout(() => {
        try {
            // Сохраняем изменения
            const productsJson = JSON.stringify(products);
            localStorage.setItem('products', productsJson);
            
            console.log('Товар сохранен в localStorage');
            console.log('Размер localStorage:', checkLocalStorageSize(), 'символов');
            console.log('Обновленный товар:', currentEditingProduct);
            
            // Обновляем отображение
            loadProducts();
            loadAdminProducts();
            
            // Закрываем модальное окно
            closeEditModal();
            
            // Показываем уведомление об успехе
            showNotification('Товар успешно обновлен!', 'success');
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            
            if (error.name === 'QuotaExceededError') {
                // Если localStorage переполнен, удаляем старые товары
                console.log('localStorage переполнен, удаляем старые товары...');
                products = products.slice(-50); // Оставляем только последние 50 товаров
                localStorage.setItem('products', JSON.stringify(products));
                
                // Пробуем сохранить снова
                localStorage.setItem('products', JSON.stringify(products));
                
                // Обновляем отображение
                loadProducts();
                loadAdminProducts();
                
                // Закрываем модальное окно
                closeEditModal();
                
                showNotification('Товар обновлен (удалены старые товары из-за нехватки места)', 'success');
            } else {
                showNotification('Ошибка сохранения товара', 'error');
            }
        }
    }, 1500);
}

// Управление заказами
function updateOrderStatus(orderIndex, status) {
    const contacts = JSON.parse(localStorage.getItem('contacts')) || [];
    if (contacts[orderIndex]) {
        contacts[orderIndex].status = status;
        localStorage.setItem('contacts', JSON.stringify(contacts));
        loadOrders();
        showNotification('Статус заказа обновлен', 'success');
    }
}

// Управление пользователями
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Только отец может изменять роли пользователей
    const canChangeRole = currentUser && currentUser.email === 'father@metall.ru';
    
    const newName = prompt('Введите новое имя:', user.name);
    if (newName && newName.trim()) {
        const newPhone = prompt('Введите новый телефон:', user.phone);
        
        user.name = newName.trim();
        if (newPhone) user.phone = newPhone.trim();
        
        // Только отец может изменять роли
        if (canChangeRole && user.email !== 'father@metall.ru') {
            const newRole = confirm('Сделать администратором?') ? 'admin' : 'user';
            user.role = newRole;
        }
        
        localStorage.setItem('users', JSON.stringify(users));
        
        // Если редактируем текущего пользователя, обновляем его данные
        if (userId === currentUser.id) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateNavigation();
            loadProfile();
        }
        
        loadUsers();
        showNotification('Пользователь обновлен', 'success');
    }
}

function deleteUser(userId) {
    const userToDelete = users.find(u => u.id === userId);
    
    // Только отец может удалять пользователей
    if (!currentUser || currentUser.email !== 'father@metall.ru') {
        showNotification('Только главный администратор может удалять пользователей', 'error');
        return;
    }
    
    // Нельзя удалить самого себя
    if (userId === currentUser.id) {
        showNotification('Нельзя удалить самого себя', 'error');
        return;
    }
    
    // Нельзя удалить отца
    if (userToDelete && userToDelete.email === 'father@metall.ru') {
        showNotification('Нельзя удалить главного администратора', 'error');
        return;
    }
    
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        users = users.filter(u => u.id !== userId);
        localStorage.setItem('users', JSON.stringify(users));
        loadUsers();
        showNotification('Пользователь удален', 'success');
    }
}

// Обработчики модальных окон
document.addEventListener('DOMContentLoaded', function() {
    // Закрытие модального окна редактирования товара
    const editModal = document.getElementById('editProductModal');
    const editCloseBtn = editModal.querySelector('.close');
    
    editCloseBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', function(e) {
        if (e.target === editModal) {
            closeEditModal();
        }
    });
    
    // Закрытие модального окна управления изображениями
    const imageManagerModal = document.getElementById('imageManagerModal');
    const imageManagerCloseBtn = imageManagerModal.querySelector('.close');
    
    imageManagerCloseBtn.addEventListener('click', closeImageManager);
    window.addEventListener('click', function(e) {
        if (e.target === imageManagerModal) {
            closeImageManager();
        }
    });
    
    // Предварительный просмотр изображений при редактировании
    const editImageInput = document.getElementById('editProductImages');
    const editImagePreview = document.getElementById('editImagePreview');
    
    if (editImageInput) {
        editImageInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            editImagePreview.innerHTML = '';
            
            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'preview-image';
                        editImagePreview.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }
});

// Управление изображениями
function openImageManager(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const imagesGrid = document.getElementById('imagesGrid');
    imagesGrid.innerHTML = '';
    
    if (product.images && product.images.length > 0) {
        product.images.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${image}" alt="Изображение ${index + 1}">
                <button class="remove-image" onclick="removeProductImage(${productId}, ${index})">&times;</button>
            `;
            imagesGrid.appendChild(imageItem);
        });
    }
    
    document.getElementById('imageManagerModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeImageManager() {
    document.getElementById('imageManagerModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function addNewImages() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        const product = products.find(p => p.id === currentEditingProduct.id);
        
        if (product) {
            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        if (!product.images) product.images = [];
                        product.images.push(e.target.result);
                        
                        // Обновляем отображение
                        openImageManager(product.id);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });
    
    input.click();
}

// Управление темами
function setupTheme() {
    // Загружаем сохраненную тему или устанавливаем темную по умолчанию
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Обновляем иконку переключателя
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'light') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Показываем уведомление
    showNotification(`Переключено на ${newTheme === 'light' ? 'светлую' : 'темную'} тему`, 'success');
}

// Функция для полной очистки товаров
function clearAllProducts() {
    if (confirm('Вы уверены, что хотите удалить ВСЕ товары? Это действие нельзя отменить!')) {
        products = [];
        localStorage.setItem('products', JSON.stringify(products));
        
        loadProducts();
        loadAdminProducts();
        showNotification('Все товары удалены', 'success');
    }
}

// Функция для проверки и удаления товаров по умолчанию
function removeDefaultProducts() {
    // Получаем текущие товары
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        const currentProducts = JSON.parse(storedProducts);
        
        // Фильтруем товары, оставляя только те, которые не являются товарами по умолчанию
        const defaultProductNames = [
            'Входная дверь',
            'Межкомнатная дверь',
            'Металлический забор',
            'Кованые ворота',
            'Кованая решетка',
            'Кованый забор',
            'Тестовый товар'
        ];
        
        const filteredProducts = currentProducts.filter(product => 
            !defaultProductNames.includes(product.name)
        );
        
        if (filteredProducts.length !== currentProducts.length) {
            products = filteredProducts;
            localStorage.setItem('products', JSON.stringify(products));
            loadProducts();
            loadAdminProducts();
            showNotification(`Удалено ${currentProducts.length - filteredProducts.length} товаров по умолчанию`, 'success');
        } else {
            showNotification('Товары по умолчанию не найдены', 'info');
        }
    } else {
        showNotification('Товары не найдены', 'info');
    }
}

// Функция для очистки localStorage
function clearLocalStorage() {
    if (confirm('Вы уверены, что хотите очистить ВСЕ данные localStorage? Это удалит все товары, контакты и настройки!')) {
        localStorage.clear();
        location.reload();
    }
}

// Функция для показа информации о localStorage
function showStorageInfo() {
    const size = checkLocalStorageSize();
    const sizeKB = (size / 1024).toFixed(2);
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const contacts = JSON.parse(localStorage.getItem('contacts')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    const info = `
        Размер localStorage: ${sizeMB} MB (${sizeKB} KB)
        Товаров: ${products.length}
        Контактов: ${contacts.length}
        Пользователей: ${users.length}
    `;
    
    alert(info);
}

// Функция для сброса данных (для отладки)
function resetAppData() {
    if (confirm('Вы уверены, что хотите сбросить ВСЕ данные приложения? Это удалит все товары, пользователей и настройки!')) {
        localStorage.clear();
        location.reload();
    }
}

// Функция для тестирования добавления товара
function testAddProduct() {
    const testProduct = {
        id: Date.now(),
        name: 'Тестовый товар',
        category: 'doors',
        price: 10000,
        description: 'Это тестовый товар для проверки функциональности',
        images: [],
        dateAdded: new Date().toISOString()
    };
    
    console.log('Тестируем добавление товара:', testProduct);
    saveProduct(testProduct);
}

// Экспорт функций для глобального доступа
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.editProfile = editProfile;
window.showMyOrders = showMyOrders;
window.showAddProductForm = showAddProductForm;
window.cancelAddProduct = cancelAddProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeEditModal = closeEditModal;
window.removeProductImage = removeProductImage;
window.updateOrderStatus = updateOrderStatus;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.openImageManager = openImageManager;
window.closeImageManager = closeImageManager;
window.addNewImages = addNewImages;
window.toggleTheme = toggleTheme;
window.resetAppData = resetAppData;
window.clearAllProducts = clearAllProducts;
window.removeDefaultProducts = removeDefaultProducts;
window.syncDataToServer = syncDataToServer;
window.testAddProduct = testAddProduct;
window.showStorageInfo = showStorageInfo;
window.clearLocalStorage = clearLocalStorage;
