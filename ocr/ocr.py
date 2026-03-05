import numpy as np
from PIL import Image
import sys
import os

class ImagePreprocessor:

    @staticmethod
    def grayscale(image: np.ndarray) -> np.ndarray:
      
        if len(image.shape) == 2:
            return image  # Already grayscale

        if image.shape[2] == 4:
            image = image[:, :, :3]  # Drop alpha channel

        # Weighted sum: human-eye luminosity model
        r, g, b = image[:, :, 0], image[:, :, 1], image[:, :, 2]
        gray = (0.299 * r + 0.587 * g + 0.114 * b).astype(np.uint8)
        return gray

    # -------------------------------------------------------------------------
    # A2. Noise Removal
    # -------------------------------------------------------------------------
    @staticmethod
    def median_filter(image: np.ndarray, kernel_size: int = 3) -> np.ndarray:
       
        h, w = image.shape
        pad = kernel_size // 2
        # Pad image with edge values to handle borders
        padded = np.pad(image, pad, mode='edge')
        output = np.zeros_like(image)

        for i in range(h):
            for j in range(w):
                # Extract the local window
                window = padded[i:i + kernel_size, j:j + kernel_size]
                # Replace center pixel with median of the window
                output[i, j] = np.median(window)

        return output.astype(np.uint8)

    @staticmethod
    def gaussian_kernel(size: int = 5, sigma: float = 1.0) -> np.ndarray:
       
        center = size // 2
        kernel = np.zeros((size, size), dtype=np.float64)

        for i in range(size):
            for j in range(size):
                x = i - center
                y = j - center
                kernel[i, j] = np.exp(-(x**2 + y**2) / (2 * sigma**2))

        # Normalize so all weights sum to 1
        kernel /= (2 * np.pi * sigma**2)
        kernel /= kernel.sum()
        return kernel

    @staticmethod
    def gaussian_filter(image: np.ndarray, kernel_size: int = 5, sigma: float = 1.0) -> np.ndarray:
       
        kernel = ImagePreprocessor.gaussian_kernel(kernel_size, sigma)
        h, w = image.shape
        pad = kernel_size // 2
        padded = np.pad(image, pad, mode='edge').astype(np.float64)
        output = np.zeros_like(image, dtype=np.float64)

        for i in range(h):
            for j in range(w):
                # Element-wise multiply window by kernel, then sum
                window = padded[i:i + kernel_size, j:j + kernel_size]
                output[i, j] = np.sum(window * kernel)

        return np.clip(output, 0, 255).astype(np.uint8)

    @staticmethod
    def histogram_equalization(image: np.ndarray) -> np.ndarray:
      
        # Step 1: Compute histogram (count of each intensity 0-255)
        hist = np.zeros(256, dtype=np.int64)
        for val in image.ravel():
            hist[val] += 1

        # Step 2: Compute cumulative distribution function (CDF)
        cdf = np.cumsum(hist).astype(np.float64)

        # Normalize CDF to range [0, 255]
        cdf_min = cdf[cdf > 0].min()
        total_pixels = image.size
        cdf_normalized = ((cdf - cdf_min) / (total_pixels - cdf_min) * 255).astype(np.uint8)

        # Step 3: Map original intensities to equalized values
        output = cdf_normalized[image]
        return output

    @staticmethod
    def clahe(image: np.ndarray, clip_limit: float = 2.0, tile_size: int = 8) -> np.ndarray:
        
        h, w = image.shape
        output = np.zeros_like(image)

        # Number of tiles
        n_tiles_y = max(1, h // tile_size)
        n_tiles_x = max(1, w // tile_size)

        for ty in range(n_tiles_y):
            for tx in range(n_tiles_x):
                # Extract tile region
                y1 = ty * tile_size
                y2 = min(y1 + tile_size, h)
                x1 = tx * tile_size
                x2 = min(x1 + tile_size, w)

                tile = image[y1:y2, x1:x2]

                if tile.size == 0:
                    continue

                # Compute histogram for this tile
                hist = np.zeros(256, dtype=np.float64)
                for val in tile.ravel():
                    hist[val] += 1

                # Clip histogram: redistribute excess above clip limit
                clip_threshold = clip_limit * tile.size / 256
                excess = 0.0
                for i in range(256):
                    if hist[i] > clip_threshold:
                        excess += hist[i] - clip_threshold
                        hist[i] = clip_threshold

                # Redistribute clipped excess equally among all bins
                redistribution = excess / 256
                hist += redistribution

                # Compute CDF and normalize
                cdf = np.cumsum(hist)
                cdf_min = cdf[cdf > 0].min()
                denom = tile.size - cdf_min
                if denom == 0:
                    denom = 1
                lut = ((cdf - cdf_min) / denom * 255).astype(np.uint8)

                # Apply mapping
                output[y1:y2, x1:x2] = lut[tile]

        return output

    @staticmethod
    def global_threshold(image: np.ndarray, threshold: int = 128) -> np.ndarray:
       
        binary = np.where(image > threshold, 255, 0).astype(np.uint8)
        return binary

    @staticmethod
    def adaptive_threshold(image: np.ndarray, block_size: int = 15, C: int = 10) -> np.ndarray:
      
        h, w = image.shape
        pad = block_size // 2
        padded = np.pad(image, pad, mode='edge').astype(np.float64)
        output = np.zeros_like(image)

        # Use integral image (summed area table) for fast local mean computation
        integral = np.cumsum(np.cumsum(padded, axis=0), axis=1)

        for i in range(h):
            for j in range(w):
                # Coordinates in padded image
                y1 = i
                y2 = i + block_size
                x1 = j
                x2 = j + block_size

                # Sum of pixels in local window using integral image
                region_sum = (integral[y2, x2]
                              - (integral[y1, x2] if y1 > 0 else 0)
                              - (integral[y2, x1] if x1 > 0 else 0)
                              + (integral[y1, x1] if y1 > 0 and x1 > 0 else 0))

                local_mean = region_sum / (block_size * block_size)
                threshold = local_mean - C

                if image[i, j] > threshold:
                    output[i, j] = 255
                else:
                    output[i, j] = 0

        return output.astype(np.uint8)

    def preprocess(self, image: np.ndarray) -> np.ndarray:
      
         
        print("  [1/4] Grayscale conversion...")
        gray = self.grayscale(image)
        print(f"         Shape: {gray.shape}")

        print("  [2/4] Noise removal (median filter 3×3)...")
        denoised = self.median_filter(gray, kernel_size=3)

        print("  [3/4] Contrast enhancement (CLAHE)...")
        enhanced = self.clahe(denoised, clip_limit=2.0, tile_size=8)

        print("  [4/4] Adaptive binarization...")
        binary = self.adaptive_threshold(enhanced, block_size=15, C=10)
        print(f"         Binary image: {binary.shape}, unique values: {np.unique(binary)}")

        return binary


# =============================================================================
# B. TEXT DETECTION
# =============================================================================

class TextDetector:
   
    @staticmethod
    def horizontal_projection(binary_image: np.ndarray) -> np.ndarray:
        
        # Text pixels are 0 (black), so count zeros per row
        text_pixels = (binary_image == 0).astype(np.int32)
        projection = np.sum(text_pixels, axis=1)
        return projection

    @staticmethod
    def vertical_projection(binary_image: np.ndarray) -> np.ndarray:
       
        text_pixels = (binary_image == 0).astype(np.int32)
        projection = np.sum(text_pixels, axis=0)
        return projection

    @staticmethod
    def find_text_lines(binary_image: np.ndarray, min_line_height: int = 5) -> list:
        
        h_proj = TextDetector.horizontal_projection(binary_image)
        threshold = max(1, np.max(h_proj) * 0.05)  # 5% of peak as threshold

        lines = []
        in_line = False
        line_start = 0

        for y in range(len(h_proj)):
            if h_proj[y] > threshold:
                if not in_line:
                    line_start = y
                    in_line = True
            else:
                if in_line:
                    if y - line_start >= min_line_height:
                        lines.append((line_start, y))
                    in_line = False

        # Handle line extending to bottom of image
        if in_line and len(h_proj) - line_start >= min_line_height:
            lines.append((line_start, len(h_proj)))

        return lines

    # -------------------------------------------------------------------------
    # B2. Connected Component Analysis (CCA)
    # -------------------------------------------------------------------------
    @staticmethod
    def connected_components(binary_image: np.ndarray) -> tuple:
      
        h, w = binary_image.shape
        labels = np.zeros((h, w), dtype=np.int32)
        current_label = 0

        # 8-connectivity: all 8 neighbors
        directions = [(-1, -1), (-1, 0), (-1, 1),
                      (0, -1),           (0, 1),
                      (1, -1),  (1, 0),  (1, 1)]

        for i in range(h):
            for j in range(w):
                # Skip background and already-labeled pixels
                if binary_image[i, j] != 0 or labels[i, j] != 0:
                    continue

                # Found new component — BFS flood fill
                current_label += 1
                queue = [(i, j)]
                labels[i, j] = current_label

                while queue:
                    cy, cx = queue.pop(0)
                    for dy, dx in directions:
                        ny, nx = cy + dy, cx + dx
                        if (0 <= ny < h and 0 <= nx < w
                                and binary_image[ny, nx] == 0
                                and labels[ny, nx] == 0):
                            labels[ny, nx] = current_label
                            queue.append((ny, nx))

        return labels, current_label

    # -------------------------------------------------------------------------
    # B3. Bounding Box Detection
    # -------------------------------------------------------------------------
    @staticmethod
    def get_bounding_boxes(labels: np.ndarray, num_components: int,
                           min_area: int = 20) -> list:
       
        boxes = []

        for label_id in range(1, num_components + 1):
            # Get all pixel coordinates for this component
            ys, xs = np.where(labels == label_id)

            if len(ys) == 0:
                continue

            area = len(ys)
            if area < min_area:
                continue  # Skip noise

            y_min, y_max = int(ys.min()), int(ys.max())
            x_min, x_max = int(xs.min()), int(xs.max())

            boxes.append({
                'id': label_id,
                'x': x_min,
                'y': y_min,
                'w': x_max - x_min + 1,
                'h': y_max - y_min + 1,
                'area': area
            })

        # Sort by reading order: top-to-bottom, then left-to-right
        boxes.sort(key=lambda b: (b['y'], b['x']))
        return boxes

    def detect(self, binary_image: np.ndarray) -> dict:
       
        print("  [1/3] Finding text lines (projection profiling)...")
        lines = self.find_text_lines(binary_image, min_line_height=5)
        print(f"         Found {len(lines)} text lines")

        print("  [2/3] Connected Component Analysis per line...")
        all_chars = []
        total = 0

        for idx, (y_start, y_end) in enumerate(lines):
            line_img = binary_image[y_start:y_end, :]
            labels, num_comp = self.connected_components(line_img)
            boxes = self.get_bounding_boxes(labels, num_comp, min_area=10)

            # Adjust y coordinates to full image
            for box in boxes:
                box['y'] += y_start

            all_chars.append(boxes)
            total += len(boxes)
            print(f"         Line {idx + 1}: {len(boxes)} characters")

        print(f"  [3/3] Total characters detected: {total}")

        return {
            'lines': lines,
            'characters': all_chars,
            'total_chars': total
        }


# =============================================================================
# C. OCR ENGINE  (from-scratch neural network)
# =============================================================================
#
# Every layer (Conv2D, MaxPool2D, ReLU, LSTM, Dense) is implemented
# with raw NumPy — no PyTorch, TensorFlow, or any ML library.
#
# NOTE: Weights are randomly initialized. Meaningful text recognition
#       requires training on a labeled Sanskrit character dataset.
# =============================================================================

class Conv2D:
   

    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3):
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.kernel_size = kernel_size

        # Xavier/Glorot initialization for stable forward pass
        scale = np.sqrt(2.0 / (in_channels * kernel_size * kernel_size))
        self.weights = np.random.randn(
            out_channels, in_channels, kernel_size, kernel_size
        ).astype(np.float32) * scale
        self.biases = np.zeros(out_channels, dtype=np.float32)

    def forward(self, x: np.ndarray) -> np.ndarray:
       
        c_in, h, w = x.shape
        pad = self.kernel_size // 2
        # Pad spatial dimensions
        x_padded = np.pad(x, ((0, 0), (pad, pad), (pad, pad)), mode='constant')

        h_out = h
        w_out = w
        output = np.zeros((self.out_channels, h_out, w_out), dtype=np.float32)

        for f in range(self.out_channels):
            for i in range(h_out):
                for j in range(w_out):
                    # Extract receptive field across all input channels
                    region = x_padded[:, i:i + self.kernel_size, j:j + self.kernel_size]
                    # Convolution: element-wise multiply and sum
                    output[f, i, j] = np.sum(region * self.weights[f]) + self.biases[f]

        return output


class MaxPool2D:
   

    def __init__(self, pool_size: int = 2):
        self.pool_size = pool_size

    def forward(self, x: np.ndarray) -> np.ndarray:
     
        c, h, w = x.shape
        ps = self.pool_size
        h_out = h // ps
        w_out = w // ps
        output = np.zeros((c, h_out, w_out), dtype=np.float32)

        for ch in range(c):
            for i in range(h_out):
                for j in range(w_out):
                    window = x[ch, i*ps:(i+1)*ps, j*ps:(j+1)*ps]
                    output[ch, i, j] = np.max(window)

        return output


class ReLU:
    """
    Rectified Linear Unit activation.

    Formula:
        f(x) = max(0, x)

    Introduces non-linearity so the network can learn complex patterns.
    """

    def forward(self, x: np.ndarray) -> np.ndarray:
        return np.maximum(0, x)


class LSTMCell:
    """
    Single LSTM Cell — implements full gate equations in NumPy.

    LSTM stores long-term dependencies using 4 gates:

    Forget Gate:    f_t = σ(W_f · [h_{t-1}, x_t] + b_f)
    Input Gate:     i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
    Cell Candidate: c̃_t = tanh(W_c · [h_{t-1}, x_t] + b_c)
    Cell State:     c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t
    Output Gate:    o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
    Hidden State:   h_t = o_t ⊙ tanh(c_t)

    Where σ = sigmoid, ⊙ = element-wise multiply.

    Parameters
    ----------
    input_size : int
        Dimensionality of input features.
    hidden_size : int
        Number of LSTM hidden units.
    """

    def __init__(self, input_size: int, hidden_size: int):
        self.input_size = input_size
        self.hidden_size = hidden_size
        concat_size = input_size + hidden_size

        # Xavier initialization for all gate weight matrices
        scale = np.sqrt(2.0 / concat_size)

        # Forget gate parameters
        self.W_f = np.random.randn(hidden_size, concat_size).astype(np.float32) * scale
        self.b_f = np.zeros(hidden_size, dtype=np.float32)

        # Input gate parameters
        self.W_i = np.random.randn(hidden_size, concat_size).astype(np.float32) * scale
        self.b_i = np.zeros(hidden_size, dtype=np.float32)

        # Cell candidate parameters
        self.W_c = np.random.randn(hidden_size, concat_size).astype(np.float32) * scale
        self.b_c = np.zeros(hidden_size, dtype=np.float32)

        # Output gate parameters
        self.W_o = np.random.randn(hidden_size, concat_size).astype(np.float32) * scale
        self.b_o = np.zeros(hidden_size, dtype=np.float32)

    @staticmethod
    def sigmoid(x: np.ndarray) -> np.ndarray:
        """Numerically stable sigmoid: σ(x) = 1 / (1 + exp(-x))"""
        x = np.clip(x, -500, 500)
        return 1.0 / (1.0 + np.exp(-x))

    def forward(self, x_sequence: np.ndarray) -> np.ndarray:
       
        seq_len = x_sequence.shape[0]
        h_t = np.zeros(self.hidden_size, dtype=np.float32)
        c_t = np.zeros(self.hidden_size, dtype=np.float32)

        outputs = np.zeros((seq_len, self.hidden_size), dtype=np.float32)

        for t in range(seq_len):
            x_t = x_sequence[t]

            # Concatenate previous hidden state with current input: [h_{t-1}, x_t]
            concat = np.concatenate([h_t, x_t])

            # Forget gate: decides what to discard from cell state
            f_t = self.sigmoid(self.W_f @ concat + self.b_f)

            # Input gate: decides what new information to store
            i_t = self.sigmoid(self.W_i @ concat + self.b_i)

            # Cell candidate: creates candidate values for cell state
            c_tilde = np.tanh(self.W_c @ concat + self.b_c)

            # Cell state update: forget old + add new
            c_t = f_t * c_t + i_t * c_tilde

            # Output gate: decides what to output from cell state
            o_t = self.sigmoid(self.W_o @ concat + self.b_o)

            # Hidden state: filtered version of cell state
            h_t = o_t * np.tanh(c_t)

            outputs[t] = h_t

        return outputs


class BiLSTM:
    

    def __init__(self, input_size: int, hidden_size: int):
        self.forward_lstm = LSTMCell(input_size, hidden_size)
        self.backward_lstm = LSTMCell(input_size, hidden_size)
        self.output_size = hidden_size * 2

    def forward(self, x_sequence: np.ndarray) -> np.ndarray:
       
        # Forward direction: left to right
        forward_out = self.forward_lstm.forward(x_sequence)

        # Backward direction: right to left
        backward_out = self.backward_lstm.forward(x_sequence[::-1])
        backward_out = backward_out[::-1]  # Reverse back to original order

        # Concatenate both directions
        return np.concatenate([forward_out, backward_out], axis=1)


class Dense:

    def __init__(self, input_size: int, output_size: int):
        scale = np.sqrt(2.0 / input_size)
        self.weights = np.random.randn(output_size, input_size).astype(np.float32) * scale
        self.biases = np.zeros(output_size, dtype=np.float32)

    @staticmethod
    def softmax(x: np.ndarray) -> np.ndarray:
      
        e_x = np.exp(x - np.max(x))
        return e_x / (e_x.sum() + 1e-8)

    def forward(self, x: np.ndarray) -> np.ndarray:
       
        seq_len = x.shape[0]
        output = np.zeros((seq_len, len(self.biases)), dtype=np.float32)

        for t in range(seq_len):
            z = self.weights @ x[t] + self.biases
            output[t] = self.softmax(z)

        return output


class SanskritOCR:
   
    # Sanskrit/Devanagari character set
    CHARSET = [
        '<blank>',  # CTC blank token (index 0)
        # Vowels (स्वर)
        'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ॠ', 'ए', 'ऐ', 'ओ', 'औ',
        # Consonants (व्यंजन)
        'क', 'ख', 'ग', 'घ', 'ङ',
        'च', 'छ', 'ज', 'झ', 'ञ',
        'ट', 'ठ', 'ड', 'ढ', 'ण',
        'त', 'थ', 'द', 'ध', 'न',
        'प', 'फ', 'ब', 'भ', 'म',
        'य', 'र', 'ल', 'व',
        'श', 'ष', 'स', 'ह',
        # Matras (vowel marks)
        'ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ',
        # Special
        'ं', 'ः', '्', 'ॐ',
        # Digits
        '०', '१', '२', '३', '४', '५', '६', '७', '८', '९',
        # Punctuation
        '।', '॥', ' ',
    ]

    def __init__(self):
        self.num_classes = len(self.CHARSET)
        self.img_height = 32  # Fixed input height

        print(f"    OCR Engine initialized:")
        print(f"    Character set size: {self.num_classes}")
        print(f"    Fixed input height: {self.img_height}px")

        # Build CNN layers
        self.conv1 = Conv2D(in_channels=1, out_channels=16, kernel_size=3)
        self.relu1 = ReLU()
        self.pool1 = MaxPool2D(pool_size=2)

        self.conv2 = Conv2D(in_channels=16, out_channels=32, kernel_size=3)
        self.relu2 = ReLU()
        self.pool2 = MaxPool2D(pool_size=2)

        self.conv3 = Conv2D(in_channels=32, out_channels=64, kernel_size=3)
        self.relu3 = ReLU()
        self.pool3 = MaxPool2D(pool_size=2)

        # Sequence modeling
        # After 3 pools: height = 32/8 = 4, so feature_dim = 64*4 = 256
        self.bilstm = BiLSTM(input_size=256, hidden_size=128)

        # Classification
        self.dense = Dense(input_size=256, output_size=self.num_classes)

    def preprocess_char_image(self, char_img: np.ndarray) -> np.ndarray:
        
        h, w = char_img.shape
        if h == 0 or w == 0:
            return np.zeros((1, self.img_height, self.img_height), dtype=np.float32)

        # Resize to fixed height, preserve aspect ratio
        new_h = self.img_height
        new_w = max(1, int(w * new_h / h))
        # Ensure width is at least 8 (divisible by pooling factor 2^3)
        new_w = max(8, new_w)
        # Make width divisible by 8
        new_w = (new_w // 8) * 8
        if new_w == 0:
            new_w = 8

        # Manual nearest-neighbor resize
        resized = np.zeros((new_h, new_w), dtype=np.float32)
        for i in range(new_h):
            for j in range(new_w):
                src_i = min(int(i * h / new_h), h - 1)
                src_j = min(int(j * w / new_w), w - 1)
                resized[i, j] = char_img[src_i, src_j]

        # Normalize to [0, 1]
        resized = resized / 255.0

        # Add channel dimension: (1, H, W)
        return resized[np.newaxis, :, :]

    def cnn_forward(self, x: np.ndarray) -> np.ndarray:
       
        # Block 1
        x = self.conv1.forward(x)
        x = self.relu1.forward(x)
        x = self.pool1.forward(x)

        # Block 2
        x = self.conv2.forward(x)
        x = self.relu2.forward(x)
        x = self.pool2.forward(x)

        # Block 3
        x = self.conv3.forward(x)
        x = self.relu3.forward(x)
        x = self.pool3.forward(x)

        # Reshape: (C, H', W') → (W', C*H') = sequence of feature vectors
        c, h, w = x.shape
        # Each column becomes a feature vector
        x = x.transpose(2, 0, 1)  # (W', C, H')
        x = x.reshape(w, c * h)    # (W', C*H')

        return x

    @staticmethod
    def ctc_greedy_decode(probabilities: np.ndarray, charset: list) -> str:
       
        # Step 1: Pick highest probability character at each timestep
        best_indices = np.argmax(probabilities, axis=1)

        # Step 2: Collapse consecutive duplicates
        collapsed = []
        prev = -1
        for idx in best_indices:
            if idx != prev:
                collapsed.append(idx)
            prev = idx

        # Step 3: Remove blank tokens (index 0)
        characters = []
        for idx in collapsed:
            if idx != 0 and idx < len(charset):
                characters.append(charset[idx])

        return ''.join(characters)

    def recognize(self, char_img: np.ndarray) -> str:
       
        # Prepare input
        x = self.preprocess_char_image(char_img)

        # CNN feature extraction
        features = self.cnn_forward(x)

        # BiLSTM sequence modeling
        lstm_out = self.bilstm.forward(features)

        # Dense layer: map to character probabilities
        probs = self.dense.forward(lstm_out)

        # CTC greedy decode
        text = self.ctc_greedy_decode(probs, self.CHARSET)

        return text


# =============================================================================
# D. FULL PIPELINE
# =============================================================================

class SanskritOCRPipeline:

    def __init__(self):
        print("=" * 60)
        print("  Sanskriti Manuscript Digitization System")
        print("  From-Scratch OCR Pipeline (NumPy only)")
        print("=" * 60)
        print()

        self.preprocessor = ImagePreprocessor()
        self.detector = TextDetector()

        print("  Initializing OCR Engine...")
        self.ocr = SanskritOCR()
        print()

    def load_image(self, image_path: str) -> np.ndarray:

        img = Image.open(image_path).convert('RGB')
        return np.array(img)

    def run(self, image_path: str) -> str:
        
        print(f"Input: {image_path}")
        print(f"{'─' * 60}")

        # Step 1: Load image
        print("\n▶ STAGE 1: Loading Image")
        image = self.load_image(image_path)
        print(f"  Image size: {image.shape[1]}×{image.shape[0]} pixels")
        print(f"  Channels: {image.shape[2]}")

        # Step 2: Preprocessing
        print(f"\n▶ STAGE 2: Image Preprocessing")
        binary = self.preprocessor.preprocess(image)

        # Step 3: Text Detection
        print(f"\n▶ STAGE 3: Text Detection")
        detection = self.detector.detect(binary)

        lines = detection['lines']
        all_chars = detection['characters']

        if detection['total_chars'] == 0:
            print("\n  ⚠ No text characters detected.")
            return ""

        # Step 4: OCR Recognition
        print(f"\n▶ STAGE 4: OCR Recognition")
        full_text_lines = []

        for line_idx, (line_start, line_end) in enumerate(lines):
            chars = all_chars[line_idx]
            if not chars:
                continue

            print(f"  Processing line {line_idx + 1}/{len(lines)} "
                  f"({len(chars)} characters)...")

            # For each detected character region, run OCR
            line_text_parts = []
            for char_box in chars:
                x, y, w, h = char_box['x'], char_box['y'], char_box['w'], char_box['h']
                char_img = binary[y:y+h, x:x+w]

                if char_img.size == 0:
                    continue

                recognized = self.ocr.recognize(char_img)
                if recognized:
                    line_text_parts.append(recognized)

            line_text = ''.join(line_text_parts)
            if line_text:
                full_text_lines.append(line_text)

        final_text = '\n'.join(full_text_lines)

        # Step 5: Output
        print(f"\n{'─' * 60}")
        print(f"▶ STAGE 5: Final Output")
        print(f"{'─' * 60}")

        if final_text:
            print(f"\n  Extracted Text ({len(final_text)} characters):")
            print(f"  {'─' * 40}")
            for line in final_text.split('\n'):
                print(f"  │ {line}")
            print(f"  {'─' * 40}")
        else:
            print("\n  No text could be recognized.")
            print("  (Model weights are random — train on labeled data for real results)")

        print(f"\n{'═' * 60}")
        print(f"  Pipeline complete.")
        print(f"  NOTE: Weights are randomly initialized.")
        print(f"  Train on a labeled Sanskrit dataset for accurate recognition.")
        print(f"{'═' * 60}")

        return final_text


# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    """CLI entry point: python ocr.py <image_path>"""
    if len(sys.argv) < 2:
        print("Usage: python ocr.py <image_path>")
        print("Example: python ocr.py manuscript.png")
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        sys.exit(1)

    pipeline = SanskritOCRPipeline()
    result = pipeline.run(image_path)

    return result


if __name__ == "__main__":
    main()
