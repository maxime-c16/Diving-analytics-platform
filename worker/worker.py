import time

def main():
    print("Worker service started...")
    while True:
        time.sleep(10)
        print("Worker heartbeat...")

if __name__ == "__main__":
    main()
