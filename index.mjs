import fetch from 'node-fetch';
import fs from 'fs';

const apiKey = 'API KEY HERE!';
const cityDatabaseFilePath = 'PATH HERE!'; // Path to the downloaded JSON file

async function fetchCityDataFromFile() {
    try {
        const data = fs.readFileSync(cityDatabaseFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading city database file:', error);
        throw error;
    }
}

async function fetchWeatherData(city) {
    const url = `http://api.openweathermap.org/data/2.5/weather?lat=${city.latitude}&lon=${city.longitude}&appid=${apiKey}`;
    try {
        const response = await fetch(url);
        const weatherData = await response.json();
        const temperatureCelsius = weatherData.main.temp - 273.15; // Convert temperature from Kelvin to Celsius
        return {
            name: city.name,
            country: city.country_name,
            temperature: temperatureCelsius,
            humidity: weatherData.main.humidity,
            // Add more weather properties as needed
        };
    } catch (error) {
        console.error(`Error fetching weather data for ${city.name}:`, error);
        return null; // Return null if fetching fails
    }
}

async function fetchAndSaveWeatherData(cities, batchSize, outputFile) {
    const batches = Math.ceil(cities.length / batchSize);
    let allWeatherData = [];

    for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min((i + 1) * batchSize, cities.length);
        const batchCities = cities.slice(batchStart, batchEnd);

        const batchWeatherData = await Promise.all(batchCities.map(city => fetchWeatherData(city)));
        allWeatherData = allWeatherData.concat(batchWeatherData.filter(data => data !== null));

        // Save data periodically
        const csvData = allWeatherData.map(({ name, country, temperature, humidity }) => `${name},${country},${temperature},${humidity}`).join('\n');
        fs.writeFileSync(outputFile, 'City,Country,Temperature (°C),Humidity (%)\n' + csvData);
        console.log(`Data for ${batchEnd} cities saved to ${outputFile}`);

        // Optional: Add delay between batches to avoid rate limiting or overloading the API server
        // await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second between batches
    }
}

async function main() {
    try {
        const cities = await fetchCityDataFromFile();
        const batchSize = 10; // Number of cities to fetch in each batch
        const outputFile = 'weather_data.csv'; // Output file path

        await fetchAndSaveWeatherData(cities, batchSize, outputFile);
        console.log('Weather data saved to weather_data.csv');
    } catch (error) {
        console.error('Error fetching or writing weather data:', error);
    }
}

main();
