# Configurar Firebase

1. Entra a https://console.firebase.google.com/ y crea un proyecto.
2. Agrega una app web dentro del proyecto.
3. Copia el objeto `firebaseConfig` que te muestra Firebase.
4. Pegalo en `firebase-config.js`, reemplazando los valores vacios.
5. En Firebase, crea una base de datos Cloud Firestore.
6. Para probar rapido, usa estas reglas en Firestore:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /businesses/dilucca/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Estas reglas son solo para probar porque dejan leer y escribir a cualquiera que tenga la pagina.
Cuando ya este funcionando, conviene agregar login y cerrar las reglas.

Si ya tenes datos cargados en la PC y Firebase esta vacio, la app los sube automaticamente la primera vez que abre con Firebase configurado.
