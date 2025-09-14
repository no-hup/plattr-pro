const fetchMenu = require('./menu_fetch');
const getRestaurantMenu = require('./getRestaurantMenu');
const { addMenuItem, updateMenuItem, deleteMenuItem, updateMenuItemAvailability } = require('./menu');

module.exports = {
  fetchMenu,
  getRestaurantMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemAvailability
};