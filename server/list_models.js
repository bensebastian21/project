const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || 'AIzaSyBsuAW4V2CtkmNp3OA26VmPojXKfG6bS_8'; // from user's env
    const genAI = new GoogleGenerativeAI(apiKey);

    // Wait, listModels might not be exposed on the SDK directly in older versions, but fetch works.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const data = await response.json();
    console.log('Supported Models:');
    data.models.forEach((model) => {
      console.log(`- ${model.name}`);
    });
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

listModels();
