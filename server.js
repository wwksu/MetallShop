const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Путь к файлу данных
const DATA_FILE = 'data.json';

// Инициализация данных
let data = {
    products: [],
    users: [],
    contacts: [],
    settings: {
        siteName: 'МеталлМастер',
        siteDescription: 'Качественные двери, заборы и кованые изделия на заказ',
        contactPhone: '+7 (XXX) XXX-XX-XX',
        contactEmail: 'master@metall.ru',
        contactAddress: 'г. Ваш город, ул. Мастерская, д. 1'
    }
};

// Загрузка данных из файла
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const fileData = fs.readFileSync(DATA_FILE, 'utf8');
            data = JSON.parse(fileData);
        } else {
            saveData();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Сохранение данных в файл
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// API маршруты

// Получить все данные
app.get('/api/data', (req, res) => {
    res.json(data);
});

// Получить товары
app.get('/api/products', (req, res) => {
    res.json(data.products);
});

// Добавить товар
app.post('/api/products', (req, res) => {
    const product = {
        id: Date.now(),
        ...req.body,
        dateAdded: new Date().toISOString()
    };
    data.products.push(product);
    saveData();
    res.json(product);
});

// Обновить товар
app.put('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = data.products.findIndex(p => p.id === id);
    if (index !== -1) {
        data.products[index] = { ...data.products[index], ...req.body };
        saveData();
        res.json(data.products[index]);
    } else {
        res.status(404).json({ error: 'Товар не найден' });
    }
});

// Удалить товар
app.delete('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = data.products.findIndex(p => p.id === id);
    if (index !== -1) {
        data.products.splice(index, 1);
        saveData();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Товар не найден' });
    }
});

// Получить пользователей
app.get('/api/users', (req, res) => {
    res.json(data.users);
});

// Добавить пользователя
app.post('/api/users', (req, res) => {
    const user = {
        id: Date.now(),
        ...req.body,
        dateRegistered: new Date().toISOString()
    };
    data.users.push(user);
    saveData();
    res.json(user);
});

// Обновить пользователя
app.put('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = data.users.findIndex(u => u.id === id);
    if (index !== -1) {
        data.users[index] = { ...data.users[index], ...req.body };
        saveData();
        res.json(data.users[index]);
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Удалить пользователя
app.delete('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = data.users.findIndex(u => u.id === id);
    if (index !== -1) {
        data.users.splice(index, 1);
        saveData();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Получить контакты
app.get('/api/contacts', (req, res) => {
    res.json(data.contacts);
});

// Добавить контакт
app.post('/api/contacts', (req, res) => {
    const contact = {
        ...req.body,
        date: new Date().toISOString()
    };
    data.contacts.push(contact);
    saveData();
    res.json(contact);
});

// Получить настройки
app.get('/api/settings', (req, res) => {
    res.json(data.settings);
});

// Обновить настройки
app.put('/api/settings', (req, res) => {
    data.settings = { ...data.settings, ...req.body };
    saveData();
    res.json(data.settings);
});

// Синхронизация всех данных
app.post('/api/sync', (req, res) => {
    const { products, users, contacts, settings } = req.body;
    
    if (products) data.products = products;
    if (users) data.users = users;
    if (contacts) data.contacts = contacts;
    if (settings) data.settings = { ...data.settings, ...settings };
    
    saveData();
    res.json({ success: true, message: 'Данные синхронизированы' });
});

// Инициализация данных при старте (и холодном старте на Vercel)
loadData();

// Экспорт приложения для Vercel серверлес
module.exports = app;

// Локальный запуск при разработке
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Сервер запущен на http://localhost:${PORT}`);
        console.log(`API доступен на http://localhost:${PORT}/api/`);
    });
}
