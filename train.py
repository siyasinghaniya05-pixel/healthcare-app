import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
import os

def train_model():
    # 1. Setup Device (Use GPU if available)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # 2. Define Data Transformations (Preprocessing & Augmentation)
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]) # ImageNet stats
        ]),
        'val': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    # IMPORTANT: Download Kaggle Chest X-Ray dataset and put it in 'data/train' and 'data/val'
    data_dir = 'data' 
    
    if not os.path.exists(data_dir):
        print(f"Error: Directory '{data_dir}' not found. Please download the dataset and place it in the 'data' folder.")
        print("Expected structure: data/train/NORMAL, data/train/PNEUMONIA, etc.")
        return

    # 3. Load Datasets
    image_datasets = {x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x])
                      for x in ['train', 'val']}
    
    dataloaders = {x: DataLoader(image_datasets[x], batch_size=32, shuffle=True, num_workers=2)
                   for x in ['train', 'val']}
    
    dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
    class_names = image_datasets['train'].classes
    print(f"Classes: {class_names}")

    # 4. Load Pre-trained Model (Transfer Learning)
    model = models.densenet121(pretrained=True)
    
    # Freeze early layers (optional, but speeds up training)
    for param in model.parameters():
        param.requires_grad = False
        
    # Replace the final classifier layer for binary classification (Normal vs Pneumonia)
    num_ftrs = model.classifier.in_features
    model.classifier = nn.Linear(num_ftrs, 2)
    model = model.to(device)

    # 5. Define Loss and Optimizer
    criterion = nn.CrossEntropyLoss()
    # Only optimize the classifier parameters
    optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)

    # 6. Training Loop
    num_epochs = 5
    best_acc = 0.0

    for epoch in range(num_epochs):
        print(f'Epoch {epoch+1}/{num_epochs}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

            # Save the best model
            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                torch.save(model.state_dict(), 'pneumonia_model.pth')
                print("Model saved!")

    print(f'Training complete. Best val Acc: {best_acc:4f}')

if __name__ == '__main__':
    train_model()
