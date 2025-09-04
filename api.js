// API модуль для синхронизации данных
class API {
    constructor(baseUrl = 'http://localhost:3000/api') {
        this.baseUrl = baseUrl;
    }

    // Универсальный метод для запросов
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Товары
    async getProducts() {
        return await this.request('/products');
    }

    async addProduct(product) {
        return await this.request('/products', {
            method: 'POST',
            body: JSON.stringify(product)
        });
    }

    async updateProduct(id, product) {
        return await this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product)
        });
    }

    async deleteProduct(id) {
        return await this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    // Пользователи
    async getUsers() {
        return await this.request('/users');
    }

    async addUser(user) {
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(user)
        });
    }

    async updateUser(id, user) {
        return await this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(user)
        });
    }

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Контакты
    async getContacts() {
        return await this.request('/contacts');
    }

    async addContact(contact) {
        return await this.request('/contacts', {
            method: 'POST',
            body: JSON.stringify(contact)
        });
    }

    // Настройки
    async getSettings() {
        return await this.request('/settings');
    }

    async updateSettings(settings) {
        return await this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // Синхронизация
    async syncAllData(data) {
        return await this.request('/sync', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Получить все данные
    async getAllData() {
        return await this.request('/data');
    }
}

// Создаем глобальный экземпляр API
window.api = new API();
