import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const coefficientsPath = path.join(
      process.cwd(),
      'model',
      'training',
      'coefficients',
      'coefficients.json'
    );

    if (!fs.existsSync(coefficientsPath)) {
      return NextResponse.json(
        { error: 'Model coefficients not found. Run training pipeline first.' },
        { status: 404 }
      );
    }

    const data = fs.readFileSync(coefficientsPath, 'utf-8');
    const coefficients = JSON.parse(data);

    return NextResponse.json(coefficients);
  } catch (error) {
    console.error('Error loading model coefficients:', error);
    return NextResponse.json({ error: 'Failed to load model coefficients' }, { status: 500 });
  }
}
