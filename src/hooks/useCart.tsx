import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productsOnCart = cart.find((product) => product.id === productId);
      let updatedCart: Product[] = [];

      if (productsOnCart) {
        const response = await api.get(`/stock/${productId}`);
        const productStock: Stock = response.data;
        if (productsOnCart.amount === productStock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          throw new Error("PRODUCTS_WITHOUT_STOCK");
        }

        updatedCart = cart.map((product) => {
          if (product.id === productId) {
            return { ...product, amount: product.amount + 1 };
          }
          return product;
        });
      }

      if (!productsOnCart) {
        const response = await api.get(`/products/${productId}`);
        const product: Product = response.data;
        updatedCart = [...cart, { ...product, amount: 1 }];
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find((product) => product.id === productId);

      if (!productExist) throw Error("Product doesn't exist");

      const updatedCart = cart.filter((product) => product.id !== productId);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find((prod) => prod.id === productId);
      if (amount <= 0) return;
      if (!product) throw Error("Product doesn't exist");

      const response = await api.get(`/stock/${productId}`);
      const productStock: Stock = response.data;

      if (amount > productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount: amount };
        }
        return product;
      });

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
