#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>

// LCD
LiquidCrystal_I2C lcd(0x3F, 16, 2);

// PINS
#define GREEN_LED 17
#define RED_LED 15
#define BUZZER 16
#define SS_PIN 5
#define RST_PIN 22

MFRC522 mfrc522(SS_PIN, RST_PIN);

// KEYPAD
const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
{'1','2','3','A'},
{'4','5','6','B'},
{'7','8','9','C'},
{'*','0','#','D'}
};

byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// WIFI
const char* ssid = "ESPTEST";
const char* password = "12345678";
const char* serverBaseUrl = "https://your-project.vercel.app";

String enteredPin = "";

// BUZZER
void beepSuccess() {
tone(BUZZER, 3000);
delay(300);
noTone(BUZZER);
}

void beepError() {
tone(BUZZER, 3000);
delay(200);
noTone(BUZZER);
delay(100);
tone(BUZZER, 500);
delay(200);
noTone(BUZZER);
}

// SEND TO SERVER
void sendToServer(String uid, String pin) {
if (WiFi.status() == WL_CONNECTED) {
String url = String(serverBaseUrl) + "/rfid_system/insert?uid=" + uid + "&pin=" + pin;
HTTPClient http;
int httpResponseCode = -1;

if (url.startsWith("https://")) {
WiFiClientSecure client;
client.setInsecure();
http.begin(client, url);
httpResponseCode = http.GET();
} else {
WiFiClient client;
http.begin(client, url);
httpResponseCode = http.GET();
}

if (httpResponseCode > 0) {

String response = http.getString();

lcd.clear();

if (response == "SUCCESS") {
lcd.print("ACCESS GRANTED");
digitalWrite(GREEN_LED, HIGH);
beepSuccess();
delay(1000);
digitalWrite(GREEN_LED, LOW);
} else if (response == "DENIED") {
lcd.print("ACCESS DENIED");
digitalWrite(RED_LED, HIGH);
beepError();
delay(1000);
digitalWrite(RED_LED, LOW);
} else {
lcd.print("SERVER ERROR");
}

delay(2000);
lcd.clear();
lcd.print("SCAN CARD");
}

http.end();
} else {
lcd.clear();
lcd.print("NO WIFI");
delay(1500);
lcd.clear();
lcd.print("SCAN CARD");
}
}

// SETUP
void setup() {
Serial.begin(115200);

pinMode(GREEN_LED, OUTPUT);
pinMode(RED_LED, OUTPUT);
pinMode(BUZZER, OUTPUT);

// BUZZER TEST
digitalWrite(BUZZER, HIGH);
delay(300);
digitalWrite(BUZZER, LOW);

// LCD INIT
lcd.init();
lcd.backlight();
lcd.print("Starting...");
delay(1500);
lcd.clear();

// RFID INIT
SPI.begin();
mfrc522.PCD_Init();

// WIFI CONNECT
lcd.print("Connecting WiFi");
WiFi.begin(ssid, password);

int tries = 0;
while (WiFi.status() != WL_CONNECTED && tries < 20) {
delay(1000);
tries++;
}

lcd.clear();
if (WiFi.status() == WL_CONNECTED) {
lcd.print("WIFI OK");
} else {
lcd.print("WIFI FAILED");
}

delay(1500);
lcd.clear();
lcd.print("SCAN CARD");
}

// LOOP
void loop() {

// WAIT FOR CARD
if (!mfrc522.PICC_IsNewCardPresent()) return;
if (!mfrc522.PICC_ReadCardSerial()) return;

// GET UID
String uid = "";
for (byte i = 0; i < mfrc522.uid.size; i++) {
if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
uid += String(mfrc522.uid.uidByte[i], HEX);
}
uid.toUpperCase();

// ASK PIN
lcd.clear();
lcd.print("ENTER PIN:");

enteredPin = "";

while (enteredPin.length() < 4) {
char key = keypad.getKey();

if (key) {
enteredPin += key;

lcd.setCursor(0,1);
for (int i = 0; i < enteredPin.length(); i++) {
lcd.print("*");
}
}
}

// SEND TO SERVER
sendToServer(uid, enteredPin);

mfrc522.PICC_HaltA();
delay(2000);
}
