# Sử dụng image Node.js Alpine để tối ưu
FROM node:20-alpine

# Thư mục làm việc
WORKDIR /app

# Copy package.json và package-lock.json để cài dependencies trước
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ source code
COPY . .

# Expose port (Vite default là 3000 như trong package.json)
EXPOSE 3000

# Chạy server development
CMD ["npm", "run", "dev"]
